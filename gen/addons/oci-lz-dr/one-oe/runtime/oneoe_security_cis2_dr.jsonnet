local profiles = import '../profiles.libsonnet';
local home_security = import '../home_security.libsonnet';

home_security(profiles.kms_pair).cis2
