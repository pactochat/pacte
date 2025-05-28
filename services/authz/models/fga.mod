# Documentation at https://openfga.dev/docs/modeling/
# Examples at https://github.com/openfga/sample-stores

########################################################
# General Check: A user {user} can perform action {action} to/on/in {object types} ... if {conditions}
#
# OpenGFA ReBAC Check: Does user {user} have relation {relation} with object {object}?
########################################################

schema: '1.2'
contents:
  - workspace.fga