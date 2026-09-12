class DomainError(Exception):
    """A business rule was violated."""


class InvalidState(DomainError):
    """The operation is not allowed in the current order state."""


class StaleVersion(DomainError):
    """An action referenced a version that is no longer current."""


class OrderNotFound(DomainError):
    """The requested order does not exist."""


class VersionNotFound(DomainError):
    """The requested version does not exist in this order."""
