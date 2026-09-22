local lz = import '../../../../landing_zone.libsonnet';

function(profile) {
  local cis1 = lz(profile.cis1_config),
  local iam_cis2 = lz(profile.iam_cis2_config),

  oke_network: cis1.network,
  oke_identity: iam_cis2.iam,
  oke_governance: cis1.governance,
  oke_observability_cis1: cis1.observability_cis1,
  oke_observability_cis1_pre: cis1.observability_cis1_pre,
  oke_observability_cis2: cis1.observability_cis2,
  oke_observability_cis2_pre: cis1.observability_cis2_pre,
  oke_security_cis1: cis1.security_cis1,
  oke_security_cis1_pre: cis1.security_cis1_pre,
  oke_security_cis2: cis1.security_cis2,
  oke_security_cis2_pre: cis1.security_cis2_pre,
  oke_clusters: cis1.extra.oke_clusters,
  oke_workers: cis1.extra.oke_workers,
}
