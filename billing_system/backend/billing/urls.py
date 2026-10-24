
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CustomerViewSet, BillViewSet

router = DefaultRouter()
router.register("products", ProductViewSet)
router.register("customers", CustomerViewSet)
router.register("bills", BillViewSet)

urlpatterns = router.urls

