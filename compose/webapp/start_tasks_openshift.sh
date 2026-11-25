#!/bin/bash

set -o errexit
set -o pipefail
set -o nounset

# Hand off to the leader-election wrapper.
# It will block here; Huey only starts when this pod holds the lease.
export RUNNING_HUEY=true
exec python /leader-election.py