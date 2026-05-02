"""
Call20 — Call Service Tests
Unit tests for call processing logic.
"""
import pytest
from decimal import Decimal
from app.services.call_service import calculate_call_cost


def test_calculate_call_cost():
    """Test cost calculation with various durations."""
    # 1 minute call
    cost = calculate_call_cost(60)
    assert isinstance(cost, Decimal)
    assert cost > 0

    # 0 second call
    cost = calculate_call_cost(0)
    assert cost == Decimal("0.0000")

    # 10 minute call
    cost_10m = calculate_call_cost(600)
    assert cost_10m > cost


def test_calculate_call_cost_precision():
    """Test cost calculation precision."""
    cost = calculate_call_cost(45) # 45 seconds
    # Check that it has 4 decimal places
    assert str(cost).split('.')[1].__len__() == 4
