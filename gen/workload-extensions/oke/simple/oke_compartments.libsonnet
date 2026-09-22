// Extension-owned platform tag inherited by OKE resource principals.

local contract = import './oke_public_load_balancer.libsonnet';

function(contexts)
  local tags(ctx) = {
    [contract.platform_tag]: ctx.platform_tag_value,
  };
  local platform_overlay(ctx) = { defined_tags+: tags(ctx) };
  local context_overlay(ctx) = {
    compartments_configuration+: {
      compartments+: {
        'CMP-LANDINGZONE-KEY'+: {
          children+: {
            [ctx.n.key_global('CMP', ctx.scope.key_segments)]+: {
              children+: {
                [ctx.scope.parent_compartment_key]+: {
                  children+: {
                    [ctx.cmp_key]+: platform_overlay(ctx),
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  std.foldl(function(acc, ctx) acc + context_overlay(ctx), contexts, {})
