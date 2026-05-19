from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import FinancingContract, Invoice, Payment
from .serializers import FinancingContractSerializer, InvoiceSerializer, PaymentSerializer
from .services import process_payment_logic

class FinancingContractViewSet(viewsets.ModelViewSet):
    serializer_class = FinancingContractSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return FinancingContract.objects.all()
        return FinancingContract.objects.filter(driver__user=user)

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class=InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Invoice.objects.all()
        return Invoice.objects.filter(contract__driver__user=user)

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Payment.objects.all()
        return Payment.objects.filter(invoice__contract__driver__user=user)

    def create(self, request, *args, **kwargs):
        serializer=self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invoice_obj = serializer.validated_data['invoice']
        amount = serializer.validated_data['amount']
        mpesa_code = serializer.validated_data['mpesa_receipt']

        payment = process_payment_logic(invoice_obj, amount, mpesa_code)

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
