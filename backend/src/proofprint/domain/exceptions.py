class ApplicationError(Exception):
    """Base error translated into a transport-specific response at the edge."""


class AuthenticationRequired(ApplicationError):
    """A valid access token or credential pair was not provided."""


class PermissionDenied(ApplicationError):
    """The actor can see the resource but cannot perform the operation."""


class ResourceNotFound(ApplicationError):
    """The resource is absent or intentionally hidden from this actor."""


class Conflict(ApplicationError):
    """The requested command conflicts with the current resource state."""
