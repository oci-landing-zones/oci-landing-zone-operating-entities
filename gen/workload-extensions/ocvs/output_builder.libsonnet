local lz = import '../../landing_zone.libsonnet';

function(profile) {
  local rendered = lz(profile.config),

  ocvs_network: rendered.network,
  ocvs_identity: rendered.iam,
  ocvs_governance: rendered.governance,
  ocvs_observability_cis1: rendered.observability_cis1,
  ocvs_observability_cis1_pre: rendered.observability_cis1_pre,
  ocvs_observability_cis2: rendered.observability_cis2,
  ocvs_observability_cis2_pre: rendered.observability_cis2_pre,
  ocvs_security_cis1: rendered.security_cis1,
  ocvs_security_cis1_pre: rendered.security_cis1_pre,
  ocvs_security_cis2: rendered.security_cis2,
  ocvs_security_cis2_pre: rendered.security_cis2_pre,
  ocvs: rendered.extra.ocvs,
}
