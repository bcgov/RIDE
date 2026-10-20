import argparse
from pathlib import Path
from pprint import pprint
import os
import re
import sys

import environ
from git import Repo
import requests

BASE_DIR = Path(__file__).resolve().parents[2]
SRC_DIR = Path(__file__).resolve().parents[1]

env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env', overwrite=True)

parser = argparse.ArgumentParser()
parser.add_argument('token')
parser.add_argument('since')
args = parser.parse_args()

API_HOST = env('TICKET_API_HOST')


if __name__ == '__main__':

    print('-------------------------------------------------------------------')

    repo = Repo(BASE_DIR)

    if repo.active_branch.name != 'release':
        print('You must be on the release branch to run this script')
        sys.exit(1)

    # Retrieve the tickets from JIRA that are labeled RIDE and were marked
    # resolved on or after the `since` argument provided
    url = f'{API_HOST}/rest/api/3/search/jql'
    body = {
        "nextPageToken": None,
        "fields": [
            "key", "resolution", "issuetype", "labels", "summary", "fixVersions"
        ],
        "jql": f"project = DBC22 and status = Done and resolved >= {args.since} and labels = RIDE"
    }
    cookies = { "tenant.session.token": args.token }
    headers = { "Content-type": "application/json"}

    issues = []
    issuesByKey = {}

    while True:
        response = requests.post(url, json=body, cookies=cookies, headers=headers)
        data = response.json()
        issues += data["issues"]
        for issue in data["issues"]:
            issuesByKey[issue["key"]] = issue
        if not data["isLast"]:
            body["nextPageToken"] = data["nextPageToken"]
        else:
            break

    # Retrieve the list of commits in main that are not present in the release
    # branch, also excluding cherry-picked commits that are functionally
    # identical but have a different hash than in main
    commits = list(repo.iter_commits('release...main', no_walk=True, reverse=True, cherry_pick=True))

    for commit in commits:
        hash = repo.git.rev_parse(commit.hexsha, short=True)
        match = re.match(r'(DBC22-[0-9]{3,5})\D', commit.summary)
        closed = None
        ticket = None
        if match:
            ticket = match.group(1)
            closed = ticket in issuesByKey
        print(f'{hash}    {commit.summary}')
        if len(commit.parents) > 1:
            print("    Commit is a merge commit, cannot cherry-pick")
        if ticket and not closed:
            print("    Ticket is not resolved")

