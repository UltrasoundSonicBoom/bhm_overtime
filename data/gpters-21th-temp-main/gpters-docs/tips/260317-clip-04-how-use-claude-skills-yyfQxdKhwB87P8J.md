---
title: "Codex에서 Claude Skills을 이용하는 방법"
source: "https://www.gpters.org/dev/post/how-use-claude-skills-yyfQxdKhwB87P8J"
author: "null"
clipped_at: "2026-03-17T07:54:45Z"
word_count: 293
method: "article-defuddle"
---

Claude Skills는 Claude Code뿐 만 아니라, OpenAI의 Codex에서도 사용할 수 있습니다. [Robert Glaser가 공유한 방법](https://www.robert-glaser.de/claude-skills-in-codex-cli/) 을 정리해보았습니다.

![\"\"](https://tribe-s3-production.imgix.net/N3abaLsa6UAtkkg5F88Lz?auto=compress,format)

우선 [Anthropic이 공개한 SKILLS](https://github.com/anthropics/skills) 를 Codex 프로젝트에 복제했습니다. 이건 Codex에서 사용하고 싶은 SKILLS를 임의로 추가해서 사용하시면 됩니다.

![\"\"](https://tribe-s3-production.imgix.net/zTSoMUpRUXI2EwQKbyA7k?auto=compress,format)

그런 다음 아래와 같은 list-skills 라는 파일을 추가해줍니다. list-skills는, 앞서 추가한 skills 파일에 있는 [SKILL.md](http://skill.md/) 를 읽는 방식입니다.

```
#!/usr/bin/env -S uv run -s\n# /// script\n# requires-python = \">=3.8\"\n# dependencies = [\"python-frontmatter\",\"pyyaml\"]\n# ///\nimport os, sys, json\nfrom pathlib import Path\nimport frontmatter\n\nroot = (\n    Path(sys.argv[1])\n    if len(sys.argv) > 1\n    else Path(\n        os.environ.get(\"CODEX_SKILLS_DIR\", str(Path.home() / \".config/codex/skills\"))\n    )\n)\nif not root.exists():\n    print(f\"missing skills dir: {root}\", file=sys.stderr)\n    sys.exit(1)\n\nskills = []\nfor f in sorted(root.rglob(\"SKILL.md\")):\n    meta = (frontmatter.load(f).metadata) or {}\n    n, d = meta.get(\"name\"), meta.get(\"description\")\n    if isinstance(n, str) and isinstance(d, str):\n        item = {\"name\": n, \"description\": d, \"path\": str(f)}\n        if \"allowed-tools\" in meta:\n            item[\"allowed-tools\"] = meta[\"allowed-tools\"]\n        skills.append(item)\nskills.sort(key=lambda s: s[\"name\"])\njson.dump(skills, sys.stdout, ensure_ascii=False, indent=2)
```

![\"스킬](https://tribe-s3-production.imgix.net/wn4gCmbc2EbZ5dHI0JICQ?auto=compress,format)

마지막으로 [AGENTS.md](http://agents.md/) 에, Codex가 Skills을 가지고 있고 list-skills에 있는 내용을 읽어 어떤 스킬이 있는지 확인하라는 내용을 추가해줍니다.

```
# Agent Instructions\n\n## Skills\n\nYou've got skills.\n\n- List your skills directly after reading this via \`scripts/list-skills skills/\`. Remember them.\n- If a skill matches a certain task at hand, only then read its full documentation (\`SKILL.md\`) and use it.
```

이러면 Codex가 작동할 때, list-skills을 통해 어떤 skills이 있는지 파악하고 상황에 맞게 사용할 수 있습니다.

Anthropic의 SKILLS에는 알고리즘 아트를 만드는 SKILL이 있어 “알고리즘으로 예술을 표현해주세요”라고 요청했습니다.

![\"Python](https://tribe-s3-production.imgix.net/XmZL0DwkphPsUbfxsPzxq?auto=compress,format)

그랬더니 OpenAI의 Codex가 list-skills를 통해 어떤 SKILL이 있는지 파악했고, 적절한 [SKILL.md](http://skill.md/) 를 찾은 것을 확인할 수 있습니다.

![\"\"](https://tribe-s3-production.imgix.net/rKZ47odcUseeQEcsbOZuf?auto=compress,format)

그리고 해당 SKILL을 이용해 알고리즘 아트를 구현한 것을 확인할 수 있습니다.

이처럼 ClaudeCode 뿐 만 아니라 OpenAI의 Codex에서도 Claude Skills를 사용할 수 있습니다.

만약, 다른 사람들의 사례를 보면서, Claude Skill을 더 깊게 활용하고 싶다면 지피터스 AI 스터디에 참여해보세요. 다른 사람의 사례를 보고 정말 많이 배우게 됩니다.

[**지피터스 스터디 살펴보기 →**](/ai-study-list)
