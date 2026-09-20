from proofprint.domain.entities.identity import CurrentActor, SystemRole, UserStatus
from proofprint.domain.exceptions import AuthenticationRequired
from proofprint.domain.interfaces.authentication import AccessTokenCodec, AuthenticationRepository


class ResolveCurrentActor:
    def __init__(self, users: AuthenticationRepository, tokens: AccessTokenCodec) -> None:
        self.users = users
        self.tokens = tokens

    def execute(self, token: str) -> CurrentActor:
        user_id = self.tokens.decode_subject(token)
        record = self.users.find_by_id(user_id)
        if (
            record is None
            or record.status != UserStatus.ACTIVE
            or record.system_role not in {SystemRole.ADMIN, SystemRole.DESIGNER}
        ):
            raise AuthenticationRequired("Access token is no longer valid")
        return record.as_actor()
