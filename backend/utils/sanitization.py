def mask_email(email: str) -> str:
    """Masks an email address for display purposes, e.g., 'us**@ex****.com'."""
    if "@" not in email:
        return email # Not a valid email, return as is

    parts = email.split("@")
    username = parts[0]
    domain = parts[1]

    # Mask username: show first two chars, then asterisks
    masked_username = username[:2] + "*" * (len(username) - 2)

    # Mask domain: show first two chars, then asterisks, then dot and extension
    # Find the last dot to preserve the TLD (.com, .org, etc.)
    if "." in domain:
        domain_parts = domain.rsplit(".", 1)
        domain_name = domain_parts[0]
        domain_tld = domain_parts[1]
        masked_domain = domain_name[:2] + "*" * (len(domain_name) - 2) + "." + domain_tld
    else:
        masked_domain = domain[:2] + "*" * (len(domain) - 2)
    
    return f"{masked_username}@{masked_domain}"
