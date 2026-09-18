class ApplicationError(Exception):
    """Base error that the presentation layer can translate to HTTP."""


class AuthenticationRequired(ApplicationError):
    """A valid access token or credential pair was not provided."""


class PermissionDenied(ApplicationError):
    """The actor can see the resource but cannot perform the operation."""


class ResourceNotFound(ApplicationError):
    """The resource is absent or intentionally hidden from this actor."""
