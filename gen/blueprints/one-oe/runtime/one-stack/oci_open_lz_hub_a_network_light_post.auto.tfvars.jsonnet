local hub_a_light_post = import '../../../../addons/oci-hub-models/hub_a/oci_open_lz_hub_a_network_light_post.auto.tfvars.jsonnet';
local vcn_environments_hub_a_post = import 'vcn_environments_hub_a_post.libsonnet';

hub_a_light_post + vcn_environments_hub_a_post
