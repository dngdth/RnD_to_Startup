import re

from proofprint.domain.exceptions import ValidationFailed


def normalize_vietnamese_phone(value: str) -> str:
    """Return one stable key for Vietnamese local and +84 phone formats."""
    digits = re.sub(r"[\s.()-]", "", value.strip())
    if digits.startswith("+84"):
        digits = "0" + digits[3:]
    elif digits.startswith("84"):
        digits = "0" + digits[2:]
    if not re.fullmatch(r"0\d{8,10}", digits):
        raise ValidationFailed("Số điện thoại Việt Nam không hợp lệ")
    return digits

