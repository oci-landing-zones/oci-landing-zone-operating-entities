#!/bin/bash

BASE_IMAGE=""
ORACLE_LINUX="ORACLE_LINUX"
CENTOS="CENTOS"
UBUNTU="UBUNTU"

#################################################
## Determine the base image (platform) we are on.
##
## 1) Oracle Linux will have the oci-image-cleanup
##    script installed by default on the image.
## 
## 2) CentOS will have a /etc/redhat-release file.
##
## 3) Ubuntu distro will have the "Ubuntu" string
##    output a part of the `uname -a` command.
##################################################

if [ -f /usr/libexec/oci-image-cleanup ]; then
  BASE_IMAGE=$ORACLE_LINUX
elif [ -f /etc/redhat-release ]; then
  BASE_IMAGE=$CENTOS
elif uname -a  | grep -i "Ubuntu" > /dev/null 2>&1 ; then
  BASE_IMAGE=$UBUNTU
fi
#echo Base Image = \"$BASE_IMAGE\"


#################################################
## Run the oci-image-cleanup script. This scrip
## comes by default on Oracle Linux. On CentOS
## platform we need to download it.
##################################################

if [ "$BASE_IMAGE" == "$ORACLE_LINUX" ]; then
  sudo /usr/libexec/oci-image-cleanup -f
elif [ "$BASE_IMAGE" == "$CENTOS" ]; then
  wget -P /tmp https://raw.githubusercontent.com/oracle/oci-utils/master/libexec/oci-image-cleanup
  chmod 700 /tmp/oci-image-cleanup
  sudo /tmp/oci-image-cleanup -f
fi


