// Build home-region CIS2 security replacements for a home/DR profile pair.
//
// function(profile_pair) -> { cis2_pre, cis2 }
local lz = import '../../../landing_zone.libsonnet';
local render_context = import '../../../render_context.libsonnet';

local key = 'KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY';

function(profile_pair)
  assert std.type(profile_pair) == 'object' &&
         std.objectHas(profile_pair, 'home') &&
         std.objectHas(profile_pair, 'dr') :
    'KMS DR profile pair must contain home and dr configurations';
  local home_ctx = render_context.from_raw_config(profile_pair.home);
  local dr_ctx = render_context.from_raw_config(profile_pair.dr);
  assert home_ctx.config.realm == dr_ctx.config.realm :
    'KMS DR profile pair must use the same OCI realm';
  local generated = lz(home_ctx.config);
  local dr_grantee =
    home_ctx.realm_constants.service_identifiers.objectstorage(dr_ctx.config.region);
  local existing_grantees =
    generated.security_cis2.vaults_configuration.keys[key].service_grantees;
  local service_grantees =
    existing_grantees +
    (if std.member(existing_grantees, dr_grantee) then [] else [dr_grantee]);
  local with_grantees(document) = document + {
    vaults_configuration+: {
      keys+: {
        [key]+: {
          service_grantees: service_grantees,
        },
      },
    },
  };
  {
    cis2_pre: with_grantees(generated.security_cis2_pre),
    cis2: with_grantees(generated.security_cis2),
  }
