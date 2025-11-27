package ivendor.authz

# Simple example: allow if user.roles contains "Verifier" and tenant matches

default allow = false

allow {
  input.action == "verification:approve"
  is_verifier
  tenant_match
}

is_verifier {
  some i
  input.user.roles[i] == "Verifier"
}

tenant_match {
  input.user.tenant_id == input.resource.tenant_id
}

# obligation for redaction example
obligations[obl] {
  input.action == "document:download"
  obl := {"redact": ["ssn", "bank_account_number"]}
}
