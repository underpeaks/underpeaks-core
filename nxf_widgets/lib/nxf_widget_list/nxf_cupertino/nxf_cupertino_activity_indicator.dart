// File: lib/nxf_widget_list/nxf_cupertino/nxf_cupertino_activity_indicator.dart
import 'package:flutter/cupertino.dart';

class NxfCupertinoActivityIndicator extends StatelessWidget {
  final bool animating;
  final double radius;

  const NxfCupertinoActivityIndicator({
    super.key,
    this.animating = true,
    this.radius = 10.0,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoActivityIndicator(
      animating: animating,
      radius: radius,
    );
  }
}
