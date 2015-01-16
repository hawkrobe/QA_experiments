---
layout: default
title: Coarse-to-Fine Inference
---

<div class="main">
  <h1>Coarse-to-Fine Inference</h1>
</div>

This set of notes contains work-in-progress on applying coarse-to-fine inference techniques to probabilistic programs. To make edits, push commits to the `gh-pages` branch of the (private) [coarse-to-fine](https://github.com/stuhlmueller/coarse-to-fine) repository.

{% assign sorted_pages = site.pages | sort:"name" %}

### Inference techniques

- Work in progress
{% for p in sorted_pages %}
  {% if p.layout == 'page' %}
    {% if p.status == 'wip' %}
  - [{{ p.title }}]({{ site.baseurl }}{{ p.url }})
    {% endif %}
  {% endif %}
{% endfor %}
- Current pages
{% for p in sorted_pages %}
  {% if p.layout == 'page' %}
    {% if p.status == 'current' %}
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
