import secrets
import string


def generate_secure_password(length=16):
    """Generate a secure password containing letters, numbers and symbols."""

    if length < 3:
        raise ValueError("Password length must be at least 3.")

    letters = string.ascii_letters
    numbers = string.digits
    symbols = "!@#$%^&*()-_=+"

    all_characters = letters + numbers + symbols

    # Guarantee at least one character from each category.
    password = [
        secrets.choice(letters),
        secrets.choice(numbers),
        secrets.choice(symbols),
    ]

    password.extend(
        secrets.choice(all_characters)
        for _ in range(length - len(password))
    )

    # Cryptographically secure shuffle.
    shuffled = []
    while password:
        index = secrets.randbelow(len(password))
        shuffled.append(password.pop(index))

    return ''.join(shuffled)