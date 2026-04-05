from uagents import Model


class DigestRequest(Model):
    cadence_json: str
    session_id: str


class DigestResult(Model):
    fingerprint_json: str
    session_id: str


class WriteRequest(Model):
    prompt: str
    fingerprint_json: str
    session_id: str


class ReviseRequest(Model):
    prompt: str
    fingerprint_json: str
    current_draft: str
    flagged_sentences_json: str
    session_id: str


class WriteResult(Model):
    draft: str
    session_id: str


class DetectRequest(Model):
    draft_text: str
    session_id: str


class DetectResult(Model):
    detector_name: str
    ai_score: float
    flagged_sentences_json: str
    session_id: str
