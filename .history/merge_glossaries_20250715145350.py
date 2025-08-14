import re
import os

def extract_terms_from_section_content(content):
    terms = {}
    lines = content.split('\n')
    current_term_key = None
    current_definition_lines = []

    for line in lines:
        h3_term_match = re.match(r'### \*\*(.*?)\*\*', line)
        li_term_match = re.match(r'- \*\*(.*?)\*\*', line)

        if h3_term_match or li_term_match:
            if current_term_key:
                terms[current_term_key] = "\n".join(current_definition_lines).strip()
            current_term_key = (h3_term_match.group(1) if h3_term_match else li_term_match.group(1)).strip()
            current_definition_lines = [line] # Include the term line itself in its definition
        elif current_term_key is not None:
            current_definition_lines.append(line)
    if current_term_key:
        terms[current_term_key] = "\n".join(current_definition_lines).strip()
    return terms

def main():
    new_glossary_path = 'docs/глоссарий'
    existing_glossary_path = 'docs/RU/Glossary.md'

    with open(new_glossary_path, 'r', encoding='utf-8') as f:
        new_content = f.read()

    with open(existing_glossary_path, 'r', encoding='utf-8') as f:
        existing_content = f.read()

    # --- Parse existing glossary to identify header, body, and footer ---
    existing_lines = existing_content.split('\n')
    header_lines = []
    body_lines = []
    footer_lines = []
    
    in_body = False
    in_footer = False

    for line in existing_lines:
        if not in_body and line.startswith('# Глоссарий Проекта "Голографические Медиа"'):
            header_lines.append(line) # Include the title in the header for now
            in_body = True
        elif in_body and line.strip() == '*Этот глоссарий будет пополняться по мере развития проекта.*':
            in_body = False
            in_footer = True
            footer_lines.append(line)
        elif in_body:
            body_lines.append(line)
        else:
            header_lines.append(line)

    existing_header = "\n".join(header_lines).strip()
    existing_body = "\n".join(body_lines).strip()
    existing_footer = "\n".join(footer_lines).strip()

    # --- Parse new glossary content ---
    new_glossary_terms = extract_terms_from_section_content(new_content)

    # --- Parse existing glossary body content ---
    existing_glossary_terms = extract_terms_from_section_content(existing_body)

    # --- Merge glossaries ---
    # New terms overwrite existing ones.
    combined_terms = existing_glossary_terms.copy()
    combined_terms.update(new_glossary_terms)

    # --- Reconstruct the new glossary content, prioritizing new sections ---
    reconstructed_new_glossary_body = []
    
    # This is a bit of a hack, but I'll re-iterate the new_content to preserve its structure
    # and then fill in definitions from combined_terms.
    temp_lines = new_content.split('\n')
    for line in temp_lines:
        h1_match = re.match(r'# (.*)', line)
        h2_match = re.match(r'## (.*)', line)
        h3_term_match = re.match(r'### \*\*(.*?)\*\*', line)

        if h1_match:
            reconstructed_new_glossary_body.append(line)
        elif h2_match:
            reconstructed_new_glossary_body.append('\n' + line) # Add a newline before new section
        elif h3_term_match:
            term_key = h3_term_match.group(1).strip()
            if term_key in combined_terms:
                reconstructed_new_glossary_body.append(combined_terms[term_key])
                # Remove from combined_terms so we know what's left (unique old terms)
                del combined_terms[term_key]
            else:
                # This should not happen if new_glossary_terms was correctly parsed and updated combined_terms
                reconstructed_new_glossary_body.append(line) # Fallback, though unlikely
        else:
            # This handles definition lines, which are already included in combined_terms[term_key]
            pass # Do nothing, as definitions are added when the term is processed

    # Now, add any remaining terms from combined_terms (these are unique terms from the old glossary)
    if combined_terms:
        reconstructed_new_glossary_body.append('\n## Дополнительные термины (из старого глоссария)')
        for term_key in sorted(combined_terms.keys()):
            reconstructed_new_glossary_body.append(combined_terms[term_key])

    final_body_content = "\n".join(reconstructed_new_glossary_body).strip()

    # --- Assemble the final content for docs/RU/Glossary.md ---
    final_glossary_content = f"{existing_header}\n\n{final_body_content}\n\n{existing_footer}"

    with open(existing_glossary_path, 'w', encoding='utf-8') as f:
        f.write(final_glossary_content)

    # --- Delete the old glossary file ---
    os.remove(new_glossary_path)

if __name__ == '__main__':
    main()
