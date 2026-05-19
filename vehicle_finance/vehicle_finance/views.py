from django.http import HttpResponse

def homepage(request):
    return HttpResponse("Hello world")

def about(request):
    return HttpResponse("My about page")