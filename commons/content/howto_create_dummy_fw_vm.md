# How to create a dummy FW VM

This HowTo would help you to create a VM that you can deploy to configure and/or test a Hub & Spoke configuration. This will let you to create the proper routing with by using its Private IP OCID and forwarding all the packets without any control/inspection, testing conectivity. 

Please notice that this doesn't bring any high availability capabilities and/or control/inspection is just intended for testing purposes.

Follow these steps:

1. Deploy an Always Free AMD Micro Instance (2 max of these per tenancy):
   - Main menu -> Compute -> Instance -> Create instance
      - Name: <Display name>, e.g.: *vm-fra-lzp-fwdmz*
      - Compartment: <Target compartment>, e.g.: *cmp-lzp-network*
      - Shape: Ampere -> VM.Standard.A1.Flex (1 OCPU, 6 GB)
      - Image: Oracle Linux (any build)
      - Primary VNIC in existing virtual cloud network
        - VCN: e.g.: *vcn-fra-lzp-hub*
        - Subnet: e.g.: *sn-fra-lzp-hub-fw-dmz*
      - Primary VNIC IP addresses -> Manually assign private IPv4 address
        - IPv4 address: e.g.: *10.0.0.10*
        - Add SSH Keys -> Generate or use any existing key of your choice
        - Show advance options 
          - Management -> Paste cloud-init-script, paste the following script:

            ```     
            #!/bin/bash
            ##
            # Copyright (c) 1982-2025 Oracle and/or its affiliates. All rights reserved.
            # Licensed under the Universal Permissive License v 1.0 as shown at
            # https://oss.oracle.com/licenses/upl.
            #
            # Description: Disables linux firewall and enables IP forwarding

            echo "+++ Disabling linux firewall and enabling IP forwarding"
            sudo echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf; sysctl -p /etc/sysctl.conf
            sudo systemctl stop firewalld
            sudo systemctl disable firewalld
            ```
    - Create

2. Skip source/destination check
   - Go to the compute instance and select the attached VNICs -> name of the primary VNIC -> 3 dots, Edit VNIC
   - Check "Skip source/destination check"
   - Save changes
