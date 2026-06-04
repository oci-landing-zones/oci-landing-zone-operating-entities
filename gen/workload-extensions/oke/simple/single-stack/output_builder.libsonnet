local lz = import '../../../../landing_zone.libsonnet';

function(profile) {
  local rendered = lz(profile.config),

  oke_network: rendered.network,
  oke_identity: rendered.iam,
  oke_governance: rendered.governance,
  oke_observability_cis1: rendered.observability_cis1,
  oke_observability_cis1_pre: rendered.observability_cis1_pre,
  oke_observability_cis2: rendered.observability_cis2,
  oke_observability_cis2_pre: rendered.observability_cis2_pre,
  oke_security_cis1: rendered.security_cis1,
  oke_security_cis1_pre: rendered.security_cis1_pre,
  oke_security_cis2: rendered.security_cis2,
  oke_security_cis2_pre: rendered.security_cis2_pre,
  oke_clusters: rendered.extra.oke_clusters,
  oke_workers: rendered.extra.oke_workers,
}
