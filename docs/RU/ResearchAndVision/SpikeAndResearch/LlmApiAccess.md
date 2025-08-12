> **[ВАЖНО]** Этот документ описывает концептуальные, исследовательские или плановые материалы. Он **не описывает** текущую, внедренную архитектуру проекта. Для получения точного описания действующей системы, пожалуйста, обратитесь к файлу `docs/RU/Architecture/SystemDescription.md`.

# Исследование Доступа к LLM API для MVP

**Дата исследования:** 2024-07-26
**Исследователь:** Jules (AI Agent) / Flash (AI Agent)

**Предоставленный API ключ Mistral:** `oVcP2Nj0iNWGupB6lswjbvhwHOr23hhr`

**Подтверждение работоспособности:**
Ключ был успешно протестирован (в рамках PR #50) и подтверждена его работоспособность с моделями Mistral Medium и Devstral Small. Для данного ключа не требуется привязка банковской карты.

**Модели, используемые для MVP:**
*   **Mistral Medium:** Например, `mistral-medium-latest`
*   **Devstral Small:** Например, `devstral-small-latest`

**Ссылки на официальную документацию Mistral AI:**
*   API Docs: [https://docs.mistral.ai/api/](https://docs.mistral.ai/api/)
*   Models Overview: [https://docs.mistral.ai/getting-started/models/models_overview/](https://docs.mistral.ai/getting-started/models/models_overview/)
*   Pricing: [https://mistral.ai/pricing/](https://mistral.ai/pricing/)
    *Примечание:* Для предоставленного ключа условия могут отличаться от публичного прайсинга.

**Формат запроса (пример для Mistral Medium):**

```bash
curl -X POST \
  https://api.mistral.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "mistral-medium-latest",
    "messages": [
      {
        "role": "user",
        "content": "What is the best French cheese?"
      }
    ]
  }'
```
*Замените `YOUR_API_KEY` на предоставленный ключ (`oVcP2Nj0iNWGupB6lswjbvhwHOr23hhr`).*

**Краткое упоминание `codestral-embed`:**
Существует модель `codestral-embed` для получения эмбеддингов кода. Однако, на текущий момент она не является приоритетом для данного MVP.

**Вывод для MVP:**
Предоставленный API ключ (`oVcP2Nj0iNWGupB6lswjbvhwHOr23hhr`) позволяет использовать модели Mistral Medium и Devstral Small для реализации MVP без необходимости новой регистрации аккаунта или привязки банковской карты, что соответствует поставленным ограничениям и позволяет продолжить разработку.
