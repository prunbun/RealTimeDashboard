import redis
import psycopg2
from psycopg2.extras import execute_values
import json
from datetime import datetime
from ..database_utils.config import load_config

# class ConsumerRedisClient