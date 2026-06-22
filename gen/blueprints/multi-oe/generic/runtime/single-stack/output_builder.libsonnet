local lz = import '../../../../../landing_zone.libsonnet';

function(profile) {
  local rendered = lz(profile.config),

  governance: rendered.governance,
  iam: rendered.iam,
  network: rendered.network,
  network_pre: rendered.network_pre,
  network_backends:
    if std.objectHas(rendered, 'network_backends') then rendered.network_backends else null,
  security_cis1_pre: rendered.security_cis1_pre,
  security_cis1: rendered.security_cis1,
  security_cis2_pre: rendered.security_cis2_pre,
  security_cis2: rendered.security_cis2,
  observability_cis1_pre: rendered.observability_cis1_pre,
  observability_cis1: rendered.observability_cis1,
  observability_cis2_pre: rendered.observability_cis2_pre,
  observability_cis2: rendered.observability_cis2,
}
