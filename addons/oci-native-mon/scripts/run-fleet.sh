#!/usr/bin/env bash
set -euo pipefail

readonly MODULE_REPO="https://github.com/adibirzu/terraform-oci-database-observability.git"
readonly MODULE_TAG="v0.3.1"
readonly MODULE_COMMIT="1e54f354f6a79fd0279f95413b88aed75013bdc7"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ADDON_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

checkout_module() {
  local checkout_dir="$1"
  git clone --quiet --branch "${MODULE_TAG}" --depth 1 "${MODULE_REPO}" "${checkout_dir}"
  [[ "$(git -C "${checkout_dir}" rev-parse HEAD)" == "${MODULE_COMMIT}" ]] ||
    die "module tag does not resolve to the reviewed commit"
}

require_regular_file() {
  [[ -f "$1" && ! -L "$1" ]] || die "$1 must be a regular, non-symlink file"
}

validate_schema() {
  local schema="$1"
  local check_dir
  require_regular_file "${schema}"
  check_dir="$(mktemp -d)"
  cp "${schema}" "${check_dir}/schema.yaml"
  if ! terraform -chdir="${check_dir}" console \
    <<< 'yamldecode(file("schema.yaml"))' >/dev/null; then
    rm -rf "${check_dir}"
    die "${schema} is not valid YAML"
  fi
  rm -rf "${check_dir}"
}

command="${1:-}"
shift || true

case "${command}" in
render)
  [[ "$#" -eq 2 ]] || die "usage: run-fleet.sh render MANIFEST OUTPUT"
  manifest="$1"
  output="$2"
  require_regular_file "${manifest}"
  tooling_dir="$(mktemp -d)"
  trap 'rm -rf "${tooling_dir}"' EXIT
  checkout_module "${tooling_dir}/module"
  python3 "${tooling_dir}/module/scripts/fleet/fleet_onboarding.py" validate \
    --manifest "${manifest}"
  python3 "${tooling_dir}/module/scripts/fleet/fleet_onboarding.py" render \
    --manifest "${manifest}" --output "${output}"
  for wave in "${output}"/wave-*; do
    [[ -f "${wave}/terraform.auto.tfvars.json" ]] || continue
    cp "${ADDON_DIR}/fleet-onboarding/"*.tf "${wave}/"
    cp "${ADDON_DIR}/fleet-onboarding/.terraform.lock.hcl" "${wave}/"
    cp "${ADDON_DIR}/fleet-onboarding/schema.yaml" "${wave}/"
  done
  ;;
plan)
  [[ "$#" -eq 2 ]] || die "usage: run-fleet.sh plan WAVE PLAN"
  wave="$1"
  plan="$2"
  [[ "${plan}" != */* ]] || die "PLAN must be a filename inside the wave directory"
  require_regular_file "${wave}/main.tf"
  [[ ! -e "${wave}/${plan}" ]] || die "plan output already exists"
  terraform -chdir="${wave}" init -backend=false -input=false
  terraform -chdir="${wave}" validate
  terraform -chdir="${wave}" plan -input=false -out="${plan}"
  ;;
package)
  [[ "$#" -eq 2 ]] || die "usage: run-fleet.sh package ROOT ARCHIVE"
  root="$1"
  archive="$2"
  [[ -d "${root}" && ! -L "${root}" ]] || die "ROOT must be a non-symlink directory"
  require_regular_file "${root}/schema.yaml"
  [[ "${archive}" == *.zip && ! -e "${archive}" ]] || die "ARCHIVE must be a new .zip file"
  archive_parent="$(dirname "${archive}")"
  [[ -d "${archive_parent}" ]] || die "ARCHIVE parent directory must exist"
  archive="$(cd "${archive_parent}" && pwd)/$(basename "${archive}")"
  terraform -chdir="${root}" fmt -check
  terraform -chdir="${root}" init -backend=false -input=false
  terraform -chdir="${root}" validate
  validate_schema "${root}/schema.yaml"
  (
    cd "${root}"
    zip -q -r "${archive}" . \
      -x '.terraform/*' '*.tfstate' '*.tfstate.*' '*.tfplan' '*.plan' \
      'terraform.tfvars' '*.auto.tfvars'
  )
  ;;
logan-validate | logan-apply | logan-verify)
  expected=1
  [[ "${command}" == "logan-apply" ]] && expected=2
  [[ "$#" -eq "${expected}" ]] || die "invalid Log Analytics arguments"
  config="$1"
  require_regular_file "${config}"
  [[ "${command}" != "logan-apply" || "$2" == "--apply" ]] ||
    die "logan-apply requires --apply"
  tooling_dir="$(mktemp -d)"
  trap 'rm -rf "${tooling_dir}"' EXIT
  checkout_module "${tooling_dir}/module"
  case "${command}" in
  logan-validate)
    "${tooling_dir}/module/scripts/log-analytics/configure-db-log-collection.sh" \
      --config "${config}"
    ;;
  logan-apply)
    "${tooling_dir}/module/scripts/log-analytics/configure-db-log-collection.sh" \
      --config "${config}" --apply
    ;;
  logan-verify)
    "${tooling_dir}/module/scripts/log-analytics/verify-db-log-collection.sh" \
      --config "${config}"
    ;;
  esac
  ;;
*)
  die "commands: render, plan, package, logan-validate, logan-apply, logan-verify"
  ;;
esac
