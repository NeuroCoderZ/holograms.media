# backend/skills/hermes_wallet.py
# HermesWallet: Task Agent (Obolos, Energy, DAO)
# Manages the economy of Obolos, compute costs (Gas), and predictions
# Personal (Local) wins: User's own balance/energy state is sovereign
# Global fallback: Statistical archetypes for market pricing

import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class HermesWallet:
    """
    HermesWallet: The "bank" of Personal Tria.
    Manages Obolos (tokens), Energy (compute budget), and DAO governance.
    Philosophy: Personal (Local) wins - user's own tokens are sovereign.
    """
    
    def __init__(self, user_id: str = "guest"):
        # Base gas fee for compute operations (Personal Tria cost)
        self.base_gas_fee = 0.000001
        
        # Current network load (Global Tria state, 0.0 - 1.0)
        # Personal wins: user can override with fixed rate if they have high reputation
        self.current_network_load = 0.45
        
        # User's Personal Tria state (Source Chain - immutable)
        self.user_id = user_id
        self.personal_obolos_balance = 0.0
        self.energy_budget = 100.0  # Compute units available
        self.reputation = 50.0
        
        logger.info(f"HermesWallet (Personal Tria): Initialized for user {user_id}")
    
    def analyze_transaction(self, compute_requested: int, user_reputation: float = None) -> Dict[str, Any]:
        """
        Calculate transaction/gas cost in Obolos based on network load and reputation.
        Personal wins: User's own reputation gives discounts (sovereign).
        Global fallback: Network load affects pricing for everyone.
        """
        if user_reputation is None:
            user_reputation = self.reputation
        
        # Dynamic pricing: higher load = more expensive compute
        load_multiplier = 1.0 + (self.current_network_load ** 2)
        
        # Discount for high reputation (Personal Tria privilege)
        # Personal wins: high-reputation users get up to 20% discount
        reputation_discount = min(0.2, (user_reputation / 100) * 0.2)
        
        final_gas_price = self.base_gas_fee * load_multiplier * (1.0 - reputation_discount)
        total_cost = compute_requested * final_gas_price
        
        # Update personal state
        self.energy_budget -= compute_requested
        
        return {
            "compute_requested": compute_requested,
            "network_load": f"{self.current_network_load * 100:.1f}%",
            "gas_price": final_gas_price,
            "total_cost_obolos": total_cost,
            "personal_balance": self.personal_obolos_balance,
            "energy_remaining": self.energy_budget,
            "recommendation": "Cost-effective to send block now." if self.current_network_load < 0.6 else "Network congested, consider waiting."
        }
    
    def process_payment(self, amount: float, payment_type: str = "obolos") -> Dict[str, Any]:
        """
        Process payment from Personal Tria (Source Chain).
        Personal wins: User's own tokens are spent first.
        """
        if payment_type == "obolos":
            if self.personal_obolos_balance >= amount:
                self.personal_obolos_balance -= amount
                return {
                    "status": "success",
                    "amount_paid": amount,
                    "new_balance": self.personal_obolos_balance,
                    "message": "Payment processed from Personal Tria."
                }
            else:
                return {
                    "status": "insufficient_funds",
                    "amount_requested": amount,
                    "current_balance": self.personal_obolos_balance,
                    "message": "Insufficient Obolos in Personal Tria."
                }
        return {"status": "error", "message": "Unknown payment type"}
    
    def generate_report(self, user_balance: float = None) -> str:
        """Generate financial advice for the user (Personal Tria insights)."""
        if user_balance is None:
            user_balance = self.personal_obolos_balance
            
        if user_balance < 0.0001:
            return "HermesWallet: Your balance is critically low. Consider renting out your idle GPU in 'Concert' mode."
        elif user_balance > 1.0:
            return "HermesWallet: You've accumulated enough Obolos to transition to Earth_0! Want to unlock expanded spaces?"
        elif self.energy_budget < 20.0:
            return "HermesWallet: Energy budget running low. Reduce compute-intensive gestures."
        else:
            return "HermesWallet: Balance stable. Continue generating quality gestures."
    
    def decay_to_global(self, days_offline: int) -> Dict[str, Any]:
        """
        Implements the "decay" logic: Global Tria absorbs from Personal when user is offline.
        Personal (Local) gets "sucked dry" but can be resurrected on return.
        """
        if days_offline <= 0:
            return {"status": "active", "message": "User is online, Personal Tria intact."}
        
        # Global Tria absorption rate: 5% of Personal balance per day offline
        absorption_rate = 0.05 * days_offline
        absorbed_obolos = self.personal_obolos_balance * min(absorption_rate, 0.5)  # Cap at 50%
        
        # Personal Tria loses Obolos to Global Tria
        self.personal_obolos_balance -= absorbed_obolos
        
        # What remains is a "half-dead skeleton" (text-only mode)
        remaining_percent = (self.personal_obolos_balance / (self.personal_obolos_balance + absorbed_obolos)) * 100
        
        return {
            "status": "decayed",
            "days_offline": days_offline,
            "obolos_absorbed_by_global": absorbed_obolos,
            "personal_balance_remaining": self.personal_obolos_balance,
            "remaining_percent": f"{remaining_percent:.1f}%",
            "message": "Personal Tria partially absorbed by Global Tria. Return to network to resurrect!"
        }
    
    def resurrect_personal_tria(self, initial_deposit: float = 0.1) -> Dict[str, Any]:
        """
        User returns to network: Personal Tria is resurrected.
        Personal wins: User's return restores full functionality.
        """
        self.personal_obolos_balance += initial_deposit
        self.energy_budget = 100.0  # Restore full energy
        
        return {
            "status": "resurrected",
            "deposit": initial_deposit,
            "new_balance": self.personal_obolos_balance,
            "energy_restored": self.energy_budget,
            "message": "Welcome back! Personal Tria has been resurrected. Full gesture capability restored."
        }

# Initialize the agent
wallet_agent = HermesWallet()
