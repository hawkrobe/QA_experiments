---
layout: default
title: Q & A
---

<div class="main">
  <h1>Questions and Answers</h1>
</div>

This set of notes contains work-in-progress on modelling question and answer behavior. To make edits, push commits to the `gh-pages` branch of the [Q_and_A](https://github.com/hawkrobe/Q_and_A) repository.

{% assign sorted_pages = site.pages | sort:"name" %}

{{sorted_pages}}

### Current models
<!-- - Current pages-->
{% for p in sorted_pages %}
  {% if p.layout == 'page' %}
    {% if p.status == 'current' %}
  - [{{ p.title }}]({{ site.baseurl }}{{ p.url }})
    {% endif %}
  {% endif %}
{% endfor %}
<!--
- Work in progress
{% for p in sorted_pages %}
  {% if p.layout == 'page' %}
    {% if p.status == 'wip' %}
  - [{{ p.title }}]({{ site.baseurl }}{{ p.url }})
    {% endif %}
  {% endif %}
{% endfor %} 
- Outdated pages
{% for p in sorted_pages %}
  {% if p.layout == 'page' %}
    {% if p.status == 'old' %}
  - [{{ p.title }}]({{ site.baseurl }}{{ p.url }})
    {% endif %}
  {% endif %}
{% endfor %}

### Other notes

{% for p in sorted_pages %}
  {% if p.layout == 'page' %}
    {% if p.status == 'other' %}
- [{{ p.title }}]({{ site.baseurl }}{{ p.url }})
    {% endif %}
  {% endif %}
{% endfor %}
- Old paper draft: [CoarseToFine.pdf]({{ site.baseurl }}/docs/CoarseToFine.pdf)
-->