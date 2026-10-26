from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterThrottle(AnonRateThrottle):
    scope = 'register'


class CartThrottle(UserRateThrottle):
    scope = 'cart'


class OrderThrottle(UserRateThrottle):
    scope = 'orders'