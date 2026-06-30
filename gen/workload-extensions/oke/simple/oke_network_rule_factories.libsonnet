// Low-level OKE network rule factories grouped by target type.

local dst_port(port) = { dst_port_max: port, dst_port_min: port };
local src_port(port) = { src_port_max: port, src_port_min: port };
local dst_port_range(port_min, port_max) = { dst_port_max: port_max, dst_port_min: port_min };
local src_port_range(port_min, port_max) = { src_port_max: port_max, src_port_min: port_min };

local nsg_egress(description, protocol, dst_nsg_key, port_fields={}) = {
  description: description,
  protocol: protocol,
  dst: dst_nsg_key,
  dst_type: 'NETWORK_SECURITY_GROUP',
} + port_fields + {
  stateless: true,
};

local nsg_ingress(description, protocol, src_nsg_key, port_fields={}) = {
  description: description,
  protocol: protocol,
  src: src_nsg_key,
} + port_fields + {
  src_type: 'NETWORK_SECURITY_GROUP',
  stateless: true,
};

local cidr_egress(description, protocol, dst_cidr, port_fields={}) = {
  description: description,
  protocol: protocol,
  dst: dst_cidr,
  dst_type: 'CIDR_BLOCK',
} + port_fields + {
  stateless: true,
};

local cidr_ingress(description, protocol, src_cidr, port_fields={}) = {
  description: description,
  protocol: protocol,
} + port_fields + {
  src: src_cidr,
  src_type: 'CIDR_BLOCK',
  stateless: true,
};

{
  nsg: {
    tcp_egress(description, dst_nsg_key, port):: nsg_egress(description, 'TCP', dst_nsg_key, dst_port(port)),
    tcp_ingress(description, src_nsg_key, port):: nsg_ingress(description, 'TCP', src_nsg_key, dst_port(port)),
    tcp_egress_src(description, dst_nsg_key, port):: nsg_egress(description, 'TCP', dst_nsg_key, src_port(port)),
    tcp_ingress_src(description, src_nsg_key, port):: nsg_ingress(description, 'TCP', src_nsg_key, src_port(port)),
    tcp_egress_any(description, dst_nsg_key):: nsg_egress(description, 'TCP', dst_nsg_key),
    tcp_ingress_any(description, src_nsg_key):: nsg_ingress(description, 'TCP', src_nsg_key),
    tcp_egress_range(description, dst_nsg_key, port_min, port_max):: nsg_egress(description, 'TCP', dst_nsg_key, dst_port_range(port_min, port_max)),
    tcp_ingress_range(description, src_nsg_key, port_min, port_max):: nsg_ingress(description, 'TCP', src_nsg_key, dst_port_range(port_min, port_max)),
    tcp_egress_src_range(description, dst_nsg_key, port_min, port_max):: nsg_egress(description, 'TCP', dst_nsg_key, src_port_range(port_min, port_max)),
    tcp_ingress_src_range(description, src_nsg_key, port_min, port_max):: nsg_ingress(description, 'TCP', src_nsg_key, src_port_range(port_min, port_max)),
    udp_egress_any(description, dst_nsg_key):: nsg_egress(description, 'UDP', dst_nsg_key),
    udp_ingress_any(description, src_nsg_key):: nsg_ingress(description, 'UDP', src_nsg_key),
    udp_egress_range(description, dst_nsg_key, port_min, port_max):: nsg_egress(description, 'UDP', dst_nsg_key, dst_port_range(port_min, port_max)),
    udp_ingress_range(description, src_nsg_key, port_min, port_max):: nsg_ingress(description, 'UDP', src_nsg_key, dst_port_range(port_min, port_max)),
    udp_egress_src_range(description, dst_nsg_key, port_min, port_max):: nsg_egress(description, 'UDP', dst_nsg_key, src_port_range(port_min, port_max)),
    udp_ingress_src_range(description, src_nsg_key, port_min, port_max):: nsg_ingress(description, 'UDP', src_nsg_key, src_port_range(port_min, port_max)),
    all_egress(description, dst_nsg_key):: nsg_egress(description, 'ALL', dst_nsg_key),
    all_ingress(description, src_nsg_key):: nsg_ingress(description, 'ALL', src_nsg_key),
  },

  cidr: {
    tcp_egress(description, dst_cidr):: cidr_egress(description, 'TCP', dst_cidr),
    tcp_ingress(description, src_cidr):: cidr_ingress(description, 'TCP', src_cidr),
    tcp_egress_src(description, dst_cidr, port):: cidr_egress(description, 'TCP', dst_cidr, src_port(port)),
    tcp_ingress_dst(description, src_cidr, port):: cidr_ingress(description, 'TCP', src_cidr, dst_port(port)),
    tcp_egress_src_range(description, dst_cidr, port_min, port_max):: cidr_egress(description, 'TCP', dst_cidr, src_port_range(port_min, port_max)),
    tcp_ingress_dst_range(description, src_cidr, port_min, port_max):: cidr_ingress(description, 'TCP', src_cidr, dst_port_range(port_min, port_max)),
    udp_egress(description, dst_cidr):: cidr_egress(description, 'UDP', dst_cidr),
    udp_ingress(description, src_cidr):: cidr_ingress(description, 'UDP', src_cidr),
    udp_egress_src_range(description, dst_cidr, port_min, port_max):: cidr_egress(description, 'UDP', dst_cidr, src_port_range(port_min, port_max)),
    udp_ingress_dst_range(description, src_cidr, port_min, port_max):: cidr_ingress(description, 'UDP', src_cidr, dst_port_range(port_min, port_max)),
  },

  service: {
    tcp_egress(description):: {
      description: description,
      protocol: 'TCP',
      dst: 'all-services',
      dst_type: 'SERVICE_CIDR_BLOCK',
      stateless: true,
    },

    tcp_ingress(ctx, description):: {
      description: description,
      protocol: 'TCP',
      src: 'all-%s-services-in-oracle-services-network' % ctx.n.region,
      src_type: 'SERVICE_CIDR_BLOCK',
      stateless: true,
    },
  },
}
