import 'package:flutter/material.dart';

class NxfNetworkImage extends StatelessWidget {
  final String url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  const NxfNetworkImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final image = Image.network(
      url,
      fit: fit,
      width: width,
      height: height,
    );

    return borderRadius != null
        ? ClipRRect(borderRadius: borderRadius!, child: image)
        : image;
  }
}
