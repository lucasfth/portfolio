"use client";

import { useState } from "react";
import type { GithubGroup, GithubPayload } from "@/lib/admin/types";
import { githubScope, relevantPull } from "@/lib/admin/github.mjs";
import AdminField from "@/components/AdminField";

function Group({ group }: { group: GithubGroup }) {
  const [all, setAll] = useState(false);
  const scope = githubScope(group, all);
  const prefix = scope.complete ? "" : "at least ";
  return <details open={group.personal || undefined} className="border-b border-border last:border-b-0">
    <summary className="cursor-pointer px-1 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
      <span className="font-medium">{group.personal ? "Personal" : group.owner}</span>
      <span className="ml-3 inline-block font-mono text-xs text-muted-foreground">{prefix}{scope.pulls} open PRs · {prefix}{scope.reviews} reviews requested · {all ? "all PRs" : "for lucasfth"}</span>
    </summary>
    <div className="space-y-4 pb-5">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} className="accent-accent" />All PRs in {group.personal ? "Personal" : group.owner}</label>
      {group.limitations.map((notice, i) => <p role="status" key={i} className="text-sm text-muted-foreground">{notice}</p>)}
      <p className="font-mono text-xs text-muted-foreground">Commits and issues: last 24 hours, up to 6 recent entries per repository. Open PRs: current, all ages.</p>
      {group.repositories.length === 0 ? <p className="text-sm text-muted-foreground">{group.repositoriesComplete ? "No accessible repositories." : "Repositories unavailable."}</p> : null}
      {group.repositories.map(repo => {
        const pulls = repo.openPulls.filter(pull => all || relevantPull(pull));
        return <section key={repo.name} className="min-w-0 border border-border p-4">
          <h3 className="break-all font-mono text-xs text-foreground">{repo.name}</h3>
          <div className="mt-3 grid min-w-0 gap-5 md:grid-cols-3">
            <div><h4 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Open pull requests</h4>
              {!repo.pullsComplete ? <p className="text-xs text-muted-foreground">Partial or unavailable PR/review source.</p> : null}
              {!pulls.length ? <p className="text-sm text-muted-foreground">{repo.pullsComplete ? "No matching open PRs." : "No matching PRs loaded; coverage incomplete."}</p> : null}
              <ul>{pulls.map(pull => <li key={pull.number} className="py-2"><a href={pull.url} target="_blank" rel="noopener noreferrer" className="block break-words text-sm hover:underline"><AdminField text={`#${pull.number} ${pull.title}`} /></a>{pull.reviewers.some(login => login.toLowerCase() === "lucasfth") ? <span className="text-xs text-muted-foreground">Review requested</span> : null}</li>)}</ul>
            </div>
            <div><h4 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Recent commits</h4>
              {!repo.activityComplete ? <p className="text-xs text-muted-foreground">Activity source unavailable.</p> : !repo.commits.length ? <p className="text-sm text-muted-foreground">No recent commits.</p> : null}
              <ul>{repo.commits.map(commit => <li key={commit.sha} className="py-2"><a href={commit.url} target="_blank" rel="noopener noreferrer" className="block break-words text-sm hover:underline"><AdminField text={commit.message} /></a><span className="text-xs text-muted-foreground">{commit.author}</span></li>)}</ul>
            </div>
            <div><h4 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Issues touched</h4>
              {repo.activityComplete && !repo.issues.length ? <p className="text-sm text-muted-foreground">No recent issues by lucasfth.</p> : null}
              <ul>{repo.issues.map(issue => <li key={issue.number} className="py-2"><a href={issue.url} target="_blank" rel="noopener noreferrer" className="block break-words text-sm hover:underline"><AdminField text={`#${issue.number} ${issue.title}`} /></a><span className="text-xs text-muted-foreground">{issue.state.toLowerCase()}</span></li>)}</ul>
            </div>
          </div>
        </section>;
      })}
    </div>
  </details>;
}

export default function AdminGithub({ payload }: { payload: GithubPayload }) {
  return <div className="min-w-0">
    {payload.coverage !== "complete" ? <p role="status" className="mb-3 text-sm text-muted-foreground">Partial GitHub coverage. Counts apply only to loaded accessible sources.</p> : null}
    {payload.limitations?.map((notice, i) => <p role="status" key={i} className="mb-2 text-sm text-muted-foreground">{notice}</p>)}
    {payload.groups.length === 0 ? <p className="text-sm text-muted-foreground">No GitHub groups loaded. Coverage notices above still apply.</p> : null}
    {payload.groups.map(group => <Group key={group.owner} group={group} />)}
  </div>;
}
