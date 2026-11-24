// Optional Recipe 02 CIS2 for production and preproduction in one add-on stack.
local profiles = import './profiles.libsonnet';
local combined = import './combined.libsonnet';
combined(profiles.prod_preprod_cis2)
