import "@stdlib/ownable";
import "@stdlib/stoppable";

// $NEURO Jetton - Живой токен с механикой Decay
// Proof of Useful Flow: токены сгорают при неактивности

trait NeuroEscrowJettonTrait {
    // Параметры decay
    decayRate: Int as uint8;          // % сгорания за цикл (0-255)
    decayCycleDays: Int as uint32;    // Дней в цикле распада
    lastDecayTimestamp: Int as uint64;// Время последнего пересчёта
    
    // Параметры mint
    baseRate: Int as uint32;          // Базовая награда за задачу
    oracleAddress: Address;           // Адрес Hermes (оракула)
    
    // Глобальная статистика
    totalBurned: Int as uint128;      // Всего сожжено токенов
    totalMinted: Int as uint128;      // Всего создано токенов
}

@interface("org.neuroescrow.jetton.v1")
contract NeuroEscrowJetton with Ownable, Stoppable, NeuroEscrowJettonTrait {
    // Балансы пользователей с метаданными
    balances: map<Address, JettonBalance>;
    
    init(
        owner: Address,
        oracle: Address,
        totalSupply: Int,
        decayRate: Int,
        decayCycleDays: Int,
        baseRate: Int
    ) {
        self.owner = owner;
        self.oracleAddress = oracle;
        self.decayRate = decayRate;
        self.decayCycleDays = decayCycleDays;
        self.lastDecayTimestamp = now();
        self.baseRate = baseRate;
        self.totalBurned = 0;
        self.totalMinted = totalSupply;
        
        // Начальная эмиссия владельцу
        self.balances.set(owner, JettonBalance{
            amount: totalSupply,
            lastActivity: now(),
            stakedAmount: 0,
            stakeMultiplier: 100 // 1.0x
        });
    }
    
    // Пересчёт баланса с учётом decay
    inline fun applyDecay(address: Address, balance: JettonBalance): JettonBalance {
        let currentTime = now();
        let daysSinceActivity = (currentTime - balance.lastActivity) / 86400;
        
        if (daysSinceActivity < 7) {
            // 🟢 Активен: нет сгорания
            return balance;
        }
        
        let decayMultiplier: Int;
        if (daysSinceActivity < 30) {
            // 🟡 Пассивен: 1% в месяц
            decayMultiplier = 1;
        } else if (daysSinceActivity < 90) {
            // 🔴 Спящий: 2% в месяц
            decayMultiplier = self.decayRate;
        } else {
            // ⚫ Мёртвый: 5% в месяц
            decayMultiplier = self.decayRate * 2 + 1;
        }
        
        // Расчёт сгоревшей части
        let burnAmount = (balance.amount * decayMultiplier) / 10000; // basis points
        let newAmount = balance.amount - burnAmount;
        
        if (burnAmount > 0) {
            self.totalBurned = self.totalBurned + burnAmount;
            // Сжигание через отправку на null-адрес
            // (в реальной реализации нужен отдельный механизм)
        }
        
        return JettonBalance{
            amount: newAmount,
            lastActivity: currentTime,
            stakedAmount: balance.stakedAmount,
            stakeMultiplier: balance.stakeMultiplier
        };
    }
    
    // Mint токенов за полезную работу (только Oracle/Hermes)
    receive(msg: MintMessage) {
        require(self.isStopped() == false, "Contract stopped");
        require(sender() == self.oracleAddress, "Only oracle can mint");
        require(msg.intelDensity >= 50 && msg.intelDensity <= 300, "Invalid density");
        
        let workerBalance = self.balances.get(msg.worker);
        if (workerBalance == null) {
            workerBalance = JettonBalance{
                amount: 0,
                lastActivity: now(),
                stakedAmount: 0,
                stakeMultiplier: 100
            };
        }
        
        // Применяем decay перед начислением
        let updatedBalance = self.applyDecay(msg.worker, workerBalance!!);
        
        // Формула: Reward = BaseRate * WorkTokens * IntelDensity * VerifyStatus * StakeMultiplier
        let reward = (self.baseRate * msg.workTokens * msg.intelDensity * updatedBalance.stakeMultiplier) / 1000000;
        
        updatedBalance.amount = updatedBalance.amount + reward;
        updatedBalance.lastActivity = now();
        
        self.balances.set(msg.worker, updatedBalance);
        self.totalMinted = self.totalMinted + reward;
        
        // Уведомление о начислении
        notify(msg.worker, reward, msg.taskId);
    }
    
    // Перевод токенов с проверкой decay
    receive(msg: TransferMessage) {
        require(self.isStopped() == false, "Contract stopped");
        
        let senderBalance = self.balances.get(sender());
        require(senderBalance != null, "No balance");
        
        // Применяем decay отправителю
        let updatedSender = self.applyDecay(sender(), senderBalance!!);
        require(updatedSender.amount >= msg.amount, "Insufficient balance");
        
        updatedSender.amount = updatedSender.amount - msg.amount;
        updatedSender.lastActivity = now();
        self.balances.set(sender(), updatedSender);
        
        // Получатель
        let receiverBalance = self.balances.get(msg.to);
        if (receiverBalance == null) {
            receiverBalance = JettonBalance{
                amount: 0,
                lastActivity: now(),
                stakedAmount: 0,
                stakeMultiplier: 100
            };
        }
        
        let updatedReceiver = self.applyDecay(msg.to, receiverBalance!!);
        updatedReceiver.amount = updatedReceiver.amount + msg.amount;
        updatedReceiver.lastActivity = now();
        
        self.balances.set(msg.to, updatedReceiver);
    }
    
    // Стейкинг для увеличения множителя наград
    receive(msg: StakeMessage) {
        require(self.isStopped() == false, "Contract stopped");
        
        let balance = self.balances.get(sender());
        require(balance != null, "No balance");
        require(balance!!.amount >= msg.amount, "Insufficient balance");
        
        let updatedBalance = self.applyDecay(sender(), balance!!);
        updatedBalance.amount = updatedBalance.amount - msg.amount;
        updatedBalance.stakedAmount = updatedBalance.stakedAmount + msg.amount;
        updatedBalance.lastActivity = now();
        
        // Увеличиваем множитель (макс 2.5x)
        let newMultiplier = updatedBalance.stakeMultiplier + 10;
        if (newMultiplier > 250) {
            newMultiplier = 250;
        }
        updatedBalance.stakeMultiplier = newMultiplier;
        
        self.balances.set(sender(), updatedBalance);
    }
    
    // Получение информации о балансе
    receive("balance") {
        let balance = self.balances.get(sender());
        if (balance == null) {
            reply("0");
        } else {
            let updated = self.applyDecay(sender(), balance!!);
            reply(updated.amount.toString());
        }
    }
    
    // Получение статистики токена
    receive("stats") {
        let stats = "Total Minted: " + self.totalMinted.toString() + 
                   "\nTotal Burned: " + self.totalBurned.toString() +
                   "\nDecay Rate: " + self.decayRate.toString() + "%" +
                   "\nBase Rate: " + self.baseRate.toString();
        reply(stats);
    }
}

// Структуры сообщений
struct MintMessage {
    worker: Address;
    workTokens: Int;        // Токены LLM, затраченные на работу
    intelDensity: Int;      // Коэффициент интеллектуальной плотности (50-300)
    verifyStatus: Int;      // Статус верификации (0 или 1)
    taskId: Int;            // ID задачи в системе
}

struct TransferMessage {
    to: Address;
    amount: Int;
    comment: String;
}

struct StakeMessage {
    amount: Int;
    duration: Int;          // Дней стейкинга
}

// Баланс пользователя с метаданными
struct JettonBalance {
    amount: Int;            // Текущий баланс
    lastActivity: Int;      // Время последней активности
    stakedAmount: Int;      // Заблокировано в стейкинге
    stakeMultiplier: Int;   // Множитель наград (100-250 = 1.0x-2.5x)
}

// Вспомогательные функции
fun notify(to: Address, amount: Int, taskId: Int) {
    // Отправка уведомления пользователю
    // В реальной реализации через external message
}
