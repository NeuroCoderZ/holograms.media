import json, sys

def extract():
    file_path = sys.argv[1]
    encodings = ['utf-8', 'utf-16', 'utf-8-sig']
    data = None
    
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                data = json.load(f)
            print(f"✅ Успешно прочитано с кодировкой: {enc}")
            break
        except Exception:
            continue
            
    if data is None:
        print("❌ Не удалось прочитать файл ни в одной из кодировок.")
        sys.exit(1)

    messages = data.get("messages", [])
    
    with open("chat_history.txt", "w", encoding="utf-8") as out:
        for msg in messages:
            info = msg.get("info", {})
            role = info.get("role", "unknown")
            
            parts = msg.get("parts", [])
            text_parts = []
            for part in parts:
                p_type = part.get("type")
                if p_type == "text":
                    text_parts.append(part.get("text", ""))
                elif p_type == "tool_call":
                    # Опционально: записываем вызовы инструментов
                    call = part.get("call", {})
                    text_parts.append(f"[TOOL_CALL: {call.get('toolName')}({call.get('arguments')})]")
                elif p_type == "tool_result":
                    # Опционально: результаты инструментов (могут быть длинными)
                    # result = part.get("result", "")
                    text_parts.append("[TOOL_RESULT]")
            
            content = "\n".join(text_parts)
            out.write(f"--- {role.upper()} ---\n{content}\n\n")

    print("✅ Переписка сохранена в chat_history.txt")

if __name__ == "__main__":
    extract()
