from .rule_engine import get_rule_risk
from .ml_engine import get_ml_risk

def get_fused_risk(data):
    rule_result = get_rule_risk(data)
    ml_result = get_ml_risk(data)

    if ml_result['confidence'] > rule_result['confidence']:
        return ml_result
    elif rule_result['confidence'] > ml_result['confidence']:
        return rule_result
    else:
        return ml_result