import json
import os
import subprocess
import sys

def run_gh_cmd(args):
    env = os.environ.copy()
    env['GH_TOKEN'] = os.getenv('ANURAGG_TOKEN', '')
    result = subprocess.run(['gh'] + args, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running gh {' '.join(args)}: {result.stderr}", file=sys.stderr)
        return None
    return result.stdout

# Get PR list
pr_list_output = run_gh_cmd(['pr', 'list', '--repo', 'decolua/9router', '--author', 'anuragg-saxenaa', '--json', 'number,title,statusCheckRollup,url'])
if pr_list_output is None:
    sys.exit(1)

prs = json.loads(pr_list_output)
print(f"Found {len(prs)} PRs from anuragg-saxenaa")

failing_prs = []
for pr in prs:
    failing = False
    if 'statusCheckRollup' in pr and pr['statusCheckRollup']:
        for check in pr['statusCheckRollup']:
            # CheckConclusion can be SUCCESS, FAILURE, TIMED_OUT, CANCELLED, etc.
            conclusion = check.get('conclusion')
            state = check.get('state')
            # Consider failing if conclusion is not SUCCESS or state is not COMPLETED? 
            # We'll look for explicit failure states.
            if conclusion in ['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED'] or state == 'FAILED':
                failing = True
                break
    if failing:
        failing_prs.append(pr)
        print(f"PR #{pr['number']} ({pr['title']}) is failing")
    else:
        print(f"PR #{pr['number']} ({pr['title']}) is passing or no checks")

# Output failing PRs as JSON
print(json.dumps(failing_prs))