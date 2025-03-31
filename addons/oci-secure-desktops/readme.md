# **[OCI Secure Desktop Guide](#)**
## **An OCI Open LZ Addon to use Secure Desktops in your LZ**

&nbsp; 

### Overview

Welcome to the **OCI Secure Desktops Guide**. 

This guide provides instructions for onboarding the Secure Desktops service to Operating Entity Landing Zones blueprints.

Oracle Cloud Infrastructure (OCI) Secure Desktops is ideal for organizations seeking controlled access to preconfigured desktop environments for their employees.OCI Secure Desktops is a cloud-native, managed service designed to ensure the security, reliability, and scalability of desktop environments. It enables organizations to provide their global workforce with secure, centrally controlled, customizable, and consistent desktop experiences, regardless of the device used.

With OCI Secure Desktops, administrators can create pools of virtual desktops in their tenancy using existing compute shapes and custom images. These desktops are identical in configuration, and users can securely access them to work with enterprise data.

The service allows administrators to manage both the virtual desktops and OCI configurations, ensuring non-technical users can easily and securely access their virtual desktops for daily tasks.

The Secure Desktops service provides:

* A way to create and maintain a large number of identical desktops.
* Controlled access to a virtual desktop for potentially non-technical users.
* Data security by storing data on Oracle Cloud Infrastructure resources and not on an individual client device.

A virtual desktop provides:

* Access to applications on a different operating system than your client device. For instance, you may have a Linux device, but need to access software that only runs on Windows.
* Access to more powerful resources, such as more CPUs and memory, storage, and so on.
* Increased data security in the event your client device is lost or crashes.
* Desktop mobility as the desktop is available wherever you can connect to the internet.

To know more about Secure Desktop Service you can check the Oracle Official documentation [here](https://docs.oracle.com/en-us/iaas/secure-desktops/overview-secure-desktops.htm).
&nbsp; 

### Benefits of this asset

Following the guidelines explained here reduces the overall management complexity and will help you with:

* Reducing configuration complexity.
* Facilitating organic growth of your Landing Zone, with the addition of the Secure Desktops service.
* Reducing the time for setting up Proof of Concepts (PoCs).

&nbsp; 

### Add-on Design

If you'd like to learn more about configuring Secure Desktops, we recommend checking out this [solution](https://docs.oracle.com/en/solutions/oci-tenancy-secure-desktop-pool/index.html#GUID-4FDC6E79-517F-49C4-80F6-AED75B85F293) published in the Architecture Center.
<img src="./content/secure_desktops.png" width="600" height="auto">

This add-on goes beyond by configuring secure desktops in a dedicated VCN connected to the HUB-and-Spoke architecture provided by the ONE-OE Landing Zone blueprint.
<img src="./content/one_oe_secure_desktops.png" width="1000" height="auto">

It includes the following resources:

* Dedicated secure desktop groups.
* Required policies.
* Dedicated spoke VCN.
  

### Add-on Implementation

Import images into the compartment and add the following tags for each custom image. These tags allow the service to determine which images to display as an option when you create a desktop pool.


oci:desktops:is_desktop_image true
oci:desktops:image_version <version>, where <version> is a meaningful reference for your use.
oci:desktops:image_os_type [Oracle Linux | Windows]


### Secure Desktop configuration Steps


https://docs.oracle.com/en/learn/deploy-oci-secure-desktops/index.html#introduction

&nbsp; 

# License

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
