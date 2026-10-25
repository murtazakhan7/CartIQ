from django.contrib.auth.models import AbstractUser, BaseUserManager

from django.db import models

class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


    
class User(AbstractUser):
    # Disable the default username field — login is email-based
    objects = UserManager()
    username = models.CharField(
        max_length=150,
        null=True,
        blank=True,
        unique=False,
    )

    # Required at registration
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20)

    # Optional — filled from profile page
    country = models.CharField(max_length=100, blank=True)
    province = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address_line = models.CharField(max_length=255, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)

    # System fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone_number']

    def __str__(self):
        return self.email

    @property
    def has_complete_address(self):
        """
        True if the user has enough address info to auto-populate
        checkout. Requires country, city, and address_line at minimum.
        """
        return bool(self.country and self.city and self.address_line)

    @property
    def has_country(self):
        """
        True if country is saved. Used on PDP to auto-load
        delivery estimate without prompting the user.
        """
        return bool(self.country)