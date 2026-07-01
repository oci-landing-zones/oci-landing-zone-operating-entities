// Shared security Vault and per-cluster OKE encryption key contribution.

function(ctx) {
  vaults_configuration+: {
    default_compartment_id: ctx.n.key_global('CMP', ['SECURITY']),

    vaults+: {
      [ctx.vault_key]: {
        name: ctx.vault_name,
      },
    },

    keys+: {
      [ctx.kube_secret_key]: {
        name: ctx.kube_secret_key_name,
        protection_mode: 'HSM',
        vault_key: ctx.vault_key,
      },
    },
  },
}
