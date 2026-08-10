local lz = import '../../../landing_zone.libsonnet';

function(profile)
  {
    scanning_configuration: lz(profile).security_cis1.scanning_configuration,
  }
