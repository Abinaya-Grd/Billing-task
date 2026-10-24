
from rest_framework import viewsets
from rest_framework.filters import SearchFilter
from .models import Product, Customer
from .serializers import ProductSerializer, CustomerSerializer
from .models import Product, Customer, Bill, BillItem
from .serializers import ProductSerializer, CustomerSerializer, BillSerializer
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .models import Bill, BillItem

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-id")
    serializer_class = ProductSerializer
    filter_backends = [SearchFilter]
    search_fields = ["name"]


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("-id")
    serializer_class = CustomerSerializer
    filter_backends = [SearchFilter]
    search_fields = ["name"]



class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.select_related("customer").prefetch_related("items").all().order_by("-id")
    serializer_class = BillSerializer

    def create(self, request, *args, **kwargs):
        customer_id = request.data.get("customer")
        items = request.data.get("items")

        if not customer_id or not isinstance(items, list) or not items:
            return Response(
                {"error": "Customer and at least one item are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                customer = Customer.objects.get(pk=customer_id)
                subtotal = Decimal("0.00")
                prepared_items = []

                for item in items:
                    product_id = item.get("product")
                    quantity = int(item.get("quantity", 0))

                    if quantity <= 0:
                        raise ValidationError("Quantity must be greater than zero.")

                    product = Product.objects.select_for_update().get(pk=product_id)

                    if product.stock < quantity:
                        raise ValidationError(
                            f"Insufficient stock for {product.name}. Available: {product.stock}"
                        )

                    line_total = product.price * quantity
                    subtotal += line_total
                    prepared_items.append((product, quantity, line_total))

                gst = (subtotal * Decimal("0.18")).quantize(Decimal("0.01"))
                grand_total = subtotal + gst
                invoice_number = f"INV-{timezone.now():%Y%m%d%H%M%S}"

                bill = Bill.objects.create(
                    invoice_number=invoice_number,
                    customer=customer,
                    subtotal=subtotal,
                    gst=gst,
                    grand_total=grand_total,
                    payment_status="Pending",
                )

                for product, quantity, line_total in prepared_items:
                    BillItem.objects.create(
                        bill=bill,
                        product=product,
                        quantity=quantity,
                        price=product.price,
                        subtotal=line_total,
                    )
                    product.stock -= quantity
                    product.save(update_fields=["stock"])

                return Response(
                    BillSerializer(bill).data,
                    status=status.HTTP_201_CREATED,
                )

        except Customer.DoesNotExist:
            return Response(
                {"error": "Customer not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (ValidationError, ValueError, TypeError) as exc:
            detail = getattr(exc, "detail", str(exc))
            return Response(
                {"error": detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
