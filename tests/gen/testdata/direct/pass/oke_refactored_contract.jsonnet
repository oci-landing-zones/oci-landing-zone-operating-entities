// New OKE envelopes preserve multiple clusters and emit only the released contract.
// contains: "legacy_envelopes_absent": true
// contains: "cluster_count": 2
// contains: "native_cni": "native"
// contains: "overlay_cni": "flannel"
// contains: "legacy_image_family_normalized": "8"
// contains: "custom_image_id": "ocid1.image.oc1..example"
// contains: "upstream_bootstrap_enabled": true
local multi = import 'gen/landing_zone_multi.jsonnet';
local platform(vcn, image, overlay=false) = {
  network: { vcn: vcn },
  extension: {
    type: 'oke_simple',
    params: {
      kubernetes_version: 'v1.35.2',
      services_cidr: if overlay then '10.97.0.0/16' else '10.96.0.0/16',
      api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
      worker_image: image,
      cni_type: if overlay then 'overlay' else 'native',
    },
  },
};
local outputs = multi({
  cis_level: 1,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: { platforms: { oke: platform('10.0.80.0/20', '8\\.[0-9]+') } },
    preprod: { platforms: { oke: platform('10.0.96.0/20', 'ocid1.image.oc1..example', true) } },
  },
});
local deployments = outputs['oke.json'].oke_configuration;
local native = deployments['CLR-FRA-LZ-PROD-OKE-KEY'];
local overlay = deployments['CLR-FRA-LZ-PREPROD-OKE-KEY'];
local native_pool = native.workers_configuration.worker_pools['NDP-FRA-LZ-PROD-OKE-KEY'];
local overlay_pool = overlay.workers_configuration.worker_pools['NDP-FRA-LZ-PREPROD-OKE-KEY'];
assert native.cluster_configuration.compartment_id != overlay.cluster_configuration.compartment_id;
assert !std.objectHas(native.cluster_configuration, 'is_enhanced');
assert !std.objectHas(native_pool, 'cluster_id') && !std.objectHas(native_pool, 'compartment_id');
assert std.objectHas(native_pool, 'pod_subnet_id') && !std.objectHas(overlay_pool, 'pod_subnet_id');
{
  legacy_envelopes_absent:
    !std.objectHas(outputs, 'oke_clusters.json') && !std.objectHas(outputs, 'oke_workers.json') &&
    std.objectFields(outputs['oke.json']) == ['oke_configuration'],
  cluster_count: std.length(deployments),
  native_cni: native.cluster_configuration.cni_type,
  overlay_cni: overlay.cluster_configuration.cni_type,
  legacy_image_family_normalized: native_pool.os_version,
  custom_image_id: overlay_pool.image_id,
  upstream_bootstrap_enabled:
    !std.objectHas(native_pool, 'disable_default_cloud_init') &&
    !std.objectHas(native_pool, 'node_metadata') && !std.objectHas(native_pool, 'cloud_init'),
}
