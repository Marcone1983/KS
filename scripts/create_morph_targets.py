"""
Blender Python Script - Create Plant Models with Morph Targets (Shape Keys)

This script creates cannabis plant models with morph targets for:
1. Leaf opening/closing animation
2. Bud blooming animation
3. Pistil growth animation

Morph targets allow smooth interpolation between shapes in Three.js
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector

def clear_scene():
    """Remove all objects from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def create_material(name, color, roughness=0.5, metallic=0.0, emission_strength=0.0):
    """Create PBR material"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    
    if emission_strength > 0:
        bsdf.inputs['Emission Color'].default_value = (*color, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    
    return mat

def create_leaf_with_morphs(size=0.1, name="Leaf"):
    """
    Create a cannabis leaf with morph targets for opening animation
    
    Shape Keys:
    - Basis: Closed/folded leaf
    - Open: Fully opened leaf
    - Wilted: Drooping/wilted leaf
    """
    # Create base mesh - a simple plane that will be shaped
    bpy.ops.mesh.primitive_plane_add(size=size)
    leaf = bpy.context.active_object
    leaf.name = name
    
    # Subdivide for more detail
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(leaf.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=4)
    bmesh.update_edit_mesh(leaf.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Add shape keys
    leaf.shape_key_add(name='Basis')  # Closed state
    
    # Open shape key
    sk_open = leaf.shape_key_add(name='Open')
    for i, v in enumerate(sk_open.data):
        # Fan out the vertices
        dist = math.sqrt(v.co.x**2 + v.co.y**2)
        angle = math.atan2(v.co.y, v.co.x)
        # Spread leaves outward and slightly down
        v.co.x *= 1.3
        v.co.y *= 1.3
        v.co.z = -dist * 0.2  # Slight droop at edges
    
    # Wilted shape key
    sk_wilted = leaf.shape_key_add(name='Wilted')
    for i, v in enumerate(sk_wilted.data):
        dist = math.sqrt(v.co.x**2 + v.co.y**2)
        # Droop significantly
        v.co.z = -dist * 0.5
        v.co.x *= 0.9
        v.co.y *= 0.9
    
    # Growing shape key (for vegetative growth)
    sk_growing = leaf.shape_key_add(name='Growing')
    for i, v in enumerate(sk_growing.data):
        # Pulse effect - slightly larger
        v.co.x *= 1.1
        v.co.y *= 1.1
        v.co.z *= 1.1
    
    # Apply material
    mat = create_material(f"{name}_Mat", (0.2, 0.55, 0.15), roughness=0.7)
    leaf.data.materials.append(mat)
    
    return leaf

def create_bud_with_morphs(size=0.05, name="Bud"):
    """
    Create a cannabis bud with morph targets for blooming animation
    
    Shape Keys:
    - Basis: Small, tight bud
    - Blooming: Swelling bud
    - FullBloom: Fully developed dense bud
    - Mature: Amber/harvest ready
    """
    # Create base icosphere
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=size)
    bud = bpy.context.active_object
    bud.name = name
    
    # Scale to elongate
    bud.scale = (0.7, 0.7, 1.2)
    bpy.ops.object.transform_apply(scale=True)
    
    # Add shape keys
    bud.shape_key_add(name='Basis')  # Small tight bud
    
    # Blooming shape key - swelling
    sk_bloom = bud.shape_key_add(name='Blooming')
    for v in sk_bloom.data:
        # Swell outward
        v.co.x *= 1.3
        v.co.y *= 1.3
        v.co.z *= 1.2
    
    # Full bloom - dense and large
    sk_full = bud.shape_key_add(name='FullBloom')
    for v in sk_full.data:
        # Maximum size
        v.co.x *= 1.6
        v.co.y *= 1.6
        v.co.z *= 1.5
        # Add some irregularity for organic look
        noise = math.sin(v.co.x * 10) * 0.02
        v.co.x += noise
        v.co.y += noise
    
    # Mature - slightly drooping, ready for harvest
    sk_mature = bud.shape_key_add(name='Mature')
    for v in sk_mature.data:
        v.co.x *= 1.5
        v.co.y *= 1.5
        v.co.z *= 1.4
        # Slight droop at bottom
        if v.co.z < 0:
            v.co.z -= 0.01
    
    # Apply material
    mat = create_material(f"{name}_Mat", (0.3, 0.5, 0.15), roughness=0.8)
    bud.data.materials.append(mat)
    
    return bud

def create_pistil_with_morphs(length=0.02, name="Pistil"):
    """
    Create a pistil with morph targets for growth animation
    
    Shape Keys:
    - Basis: Short, white pistil
    - Growing: Elongating pistil
    - Mature: Full length, curling, orange tint
    """
    # Create thin cylinder
    bpy.ops.mesh.primitive_cylinder_add(radius=0.002, depth=length, vertices=8)
    pistil = bpy.context.active_object
    pistil.name = name
    
    # Add shape keys
    pistil.shape_key_add(name='Basis')  # Short
    
    # Growing
    sk_grow = pistil.shape_key_add(name='Growing')
    for v in sk_grow.data:
        if v.co.z > 0:
            v.co.z *= 1.5
    
    # Mature - full length with curl
    sk_mature = pistil.shape_key_add(name='Mature')
    for v in sk_mature.data:
        if v.co.z > 0:
            v.co.z *= 2.0
            # Add slight curl
            curl = math.sin(v.co.z * 50) * 0.003
            v.co.x += curl
    
    # Apply material (white to orange gradient would be done in shader)
    mat = create_material(f"{name}_Mat", (0.95, 0.9, 0.85), roughness=0.6)
    pistil.data.materials.append(mat)
    
    return pistil

def create_animated_plant(stage_name, include_buds=False):
    """
    Create a complete plant with all morph targets for animation
    """
    clear_scene()
    
    # Create empty parent
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    plant_root = bpy.context.active_object
    plant_root.name = f"Plant_{stage_name}"
    
    # Stem material
    stem_mat = create_material("Stem", (0.3, 0.25, 0.15), roughness=0.8)
    
    # Create main stem
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.5, location=(0, 0, 0.25))
    stem = bpy.context.active_object
    stem.name = "MainStem"
    stem.parent = plant_root
    stem.data.materials.append(stem_mat)
    
    # Create leaves with morph targets at different heights
    leaf_positions = [
        (0.1, 0, 0.1, 0),
        (-0.1, 0, 0.1, 180),
        (0, 0.1, 0.2, 90),
        (0, -0.1, 0.2, 270),
        (0.08, 0, 0.3, 0),
        (-0.08, 0, 0.3, 180),
        (0, 0.08, 0.4, 90),
        (0, -0.08, 0.4, 270),
    ]
    
    for i, (x, y, z, rot) in enumerate(leaf_positions):
        leaf = create_leaf_with_morphs(size=0.08 - i * 0.005, name=f"Leaf_{i}")
        leaf.location = (x, y, z)
        leaf.rotation_euler = (math.radians(-30), 0, math.radians(rot))
        leaf.parent = plant_root
    
    # Create buds with morph targets (for flowering stages)
    if include_buds:
        # Main cola
        main_bud = create_bud_with_morphs(size=0.06, name="MainCola")
        main_bud.location = (0, 0, 0.55)
        main_bud.parent = plant_root
        
        # Side buds
        bud_positions = [
            (0.08, 0, 0.35),
            (-0.08, 0, 0.35),
            (0, 0.08, 0.4),
            (0, -0.08, 0.4),
        ]
        
        for i, (x, y, z) in enumerate(bud_positions):
            bud = create_bud_with_morphs(size=0.04, name=f"SideBud_{i}")
            bud.location = (x, y, z)
            bud.parent = plant_root
            
            # Add pistils to each bud
            for j in range(6):
                angle = (j / 6) * math.pi * 2
                pistil = create_pistil_with_morphs(length=0.015, name=f"Pistil_{i}_{j}")
                pistil.location = (
                    x + math.cos(angle) * 0.02,
                    y + math.sin(angle) * 0.02,
                    z + 0.02
                )
                pistil.rotation_euler = (math.radians(30), 0, angle)
                pistil.parent = plant_root
    
    # Add soil base
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.03, location=(0, 0, -0.015))
    soil = bpy.context.active_object
    soil.name = "Soil"
    soil.parent = plant_root
    soil_mat = create_material("Soil", (0.15, 0.1, 0.05), roughness=0.9)
    soil.data.materials.append(soil_mat)
    
    return plant_root

def export_glb(filepath):
    """Export scene as GLB with morph targets"""
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_animations=False,
        export_materials='EXPORT',
        export_morph=True,  # Include morph targets
        export_morph_normal=True,
    )

def main():
    """Generate plant models with morph targets"""
    output_dir = "/home/ubuntu/ks-mobile/assets/models/animated"
    os.makedirs(output_dir, exist_ok=True)
    
    # Create vegetative plant with leaf morphs
    print("Creating vegetative plant with morph targets...")
    create_animated_plant("vegetative", include_buds=False)
    export_glb(os.path.join(output_dir, "plant_vegetative_morphs.glb"))
    
    # Create flowering plant with all morphs
    print("Creating flowering plant with morph targets...")
    create_animated_plant("flowering", include_buds=True)
    export_glb(os.path.join(output_dir, "plant_flowering_morphs.glb"))
    
    # Create individual components for flexibility
    print("Creating individual leaf with morphs...")
    clear_scene()
    leaf = create_leaf_with_morphs(size=0.1, name="AnimatedLeaf")
    export_glb(os.path.join(output_dir, "leaf_morphs.glb"))
    
    print("Creating individual bud with morphs...")
    clear_scene()
    bud = create_bud_with_morphs(size=0.05, name="AnimatedBud")
    export_glb(os.path.join(output_dir, "bud_morphs.glb"))
    
    print("Creating individual pistil with morphs...")
    clear_scene()
    pistil = create_pistil_with_morphs(length=0.02, name="AnimatedPistil")
    export_glb(os.path.join(output_dir, "pistil_morphs.glb"))
    
    print("All morph target models created successfully!")

if __name__ == "__main__":
    main()
