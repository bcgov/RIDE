from django import template

register = template.Library()

@register.inclusion_tag("events/header.html", takes_context=True)
def sortable(context, column, field=None):
    field = column.lower() if field is None else field
    order = context['view'].get_ordering()
    size = context['view'].get_paginate_by()
    sort = None
    if order.endswith(field):
        sort = 'desc' if order.startswith('-') else 'asc'
    return { 'sort': sort, 'column': column, 'field': field, 'size': size, 'page': context['page_obj'] }


@register.inclusion_tag("events/pagination.html", takes_context=True)
def paginate(context, on_each_side=2, on_ends=2):

    paginator = context['paginator']
    page = context['page_obj']
    page_range = paginator.get_elided_page_range(
        page.number, on_each_side=on_each_side, on_ends=on_ends
    )

    previous_page = page.previous_page_number() if page.has_previous() else None
    next_page = page.next_page_number() if page.has_next() else None

    return {
        'page_range': page_range,
        'ordering': context['view'].get_ordering(),
        'size': context['view'].get_paginate_by(),
        'ellipsis': paginator.ELLIPSIS,
        'previous': previous_page,
        'next': next_page,
        'current': page.number,
        'request': context['request']
    }


@register.inclusion_tag("events/page_size.html", takes_context=True)
def page_sizes(context):

    return {
        'current': int(context['view'].get_paginate_by()),
        'ordering': context['view'].get_ordering(),
        'sizes': [10, 20, 50, 100],
    }
