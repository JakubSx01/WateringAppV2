# myapp/logging_filters.py
import logging

class SecurityContextFilter(logging.Filter):
    def filter(self, record):
        user = 'anonymous'
        ip = 'unknown'

        # Attempt to get request from log record's extra data
        if hasattr(record, 'request'):
            request = record.request
            ip = request.META.get('REMOTE_ADDR', 'unknown')
            if hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user.username
            else:
                user = 'anonymous'
        elif hasattr(record, 'ip_address'): # Fallback if IP is passed directly
             ip = record.ip_address
        # Add more potential sources for user/IP if needed

        record.user = user
        record.ip = ip
        return True