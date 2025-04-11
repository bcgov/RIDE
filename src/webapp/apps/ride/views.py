from django.contrib.auth.decorators import login_not_required
from django.shortcuts import render

@login_not_required
def home(request):

    return render(request, 'ride/base.html')


def cameras(request):

    return render(request, 'ride/cameras.html')