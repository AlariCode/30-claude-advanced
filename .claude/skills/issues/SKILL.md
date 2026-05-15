---
name: issues
description: Создает github issues и milestones из файла плана. Использую, когда есть готовый план с фазами, и нужно создать бэклог на github.
---

# Plan Generator

Прочитай план из файла: $ARGUMENTS

Для каждой фазы создай milestone и issues в GitHub, используя gh CLI.

## Порядок действий

1. Прочитай файл плана
2. Для каждой фазы создай milestone:
   `gh api repos/:owner/:repo/milestones -f title="Фаза N: название"`

3. Для каждой задачи в фазе создай Issue:
   `gh issue create --title "..." --body "..." --label "..." --milestone "..."`

## Формат Issue

**Title**: текст задачи из плана (без[])
**Body**: описани задачи
