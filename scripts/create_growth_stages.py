"""
Blender Python Script - 8 Growth Stages of Cannabis Plant
Creates realistic 3D models with candelabra structure

Structure:
- Central stem with nodes
- 2 opposing branches per node (perpendicular)
- Next node has branches rotated 90°
- Bottom branches longest, progressively shorter going up
- Christmas tree/candelabra shape
- Main cola larger than side branches

Stages:
1. Seedling - small sprout
2. Young Plant - first true leaves
3. Mid-Vegetative - developing plant
4. Full Vegetative - ready for flowering
5. Pre-Flowering - white pistils starting
6. Early Flowering - white heads visible, calyxes separated
7. Full Flowering - calyxes swollen and connected, dense buds
8. Maturation - chlorophyll degrading, leaves yellow, harvest ready
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

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
    
    # Clear default nodes
    nodes.clear()
    
    # Create nodes
    output = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    
    # Set properties
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    
    if emission_strength > 0:
        bsdf.inputs['Emission Color'].default_value = (*color, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    
    # Link nodes
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    
    return mat

def create_stem_segment(length, radius_bottom, radius_top, position, parent=None):
    """Create a tapered cylinder for stem segment"""
    bpy.ops.mesh.primitive_cone_add(
        vertices=12,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=length,
        location=position
    )
    segment = bpy.context.active_object
    if parent:
        segment.parent = parent
    return segment

def create_leaf(size, is_fan_leaf=True, stage='vegetative', yellowing=0.0):
    """Create cannabis leaf with proper shape"""
    bpy.ops.mesh.primitive_plane_add(size=size)
    leaf = bpy.context.active_object
    
    # Enter edit mode to shape the leaf
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(leaf.data)
    
    # Subdivide for more detail
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=3)
    bmesh.update_edit_mesh(leaf.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Create leaf material based on stage
    if yellowing > 0:
        # Maturation stage - yellowing leaves
        green = (0.2 + yellowing * 0.5, 0.5 - yellowing * 0.2, 0.1)
    elif stage == 'flowering':
        green = (0.15, 0.45, 0.1)  # Darker green during flowering
    else:
        green = (0.2, 0.55, 0.15)  # Bright green vegetative
    
    mat = create_material(f"Leaf_{stage}", green, roughness=0.7)
    leaf.data.materials.append(mat)
    
    return leaf

def create_bud(size, stage='early', density=0.5):
    """Create cannabis bud/cola based on flowering stage"""
    # Base calyx cluster
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=size,
        location=(0, 0, 0)
    )
    bud = bpy.context.active_object
    
    # Scale to elongate
    bud.scale = (0.7, 0.7, 1.2 + density * 0.5)
    bpy.ops.object.transform_apply(scale=True)
    
    # Add displacement for organic look
    bpy.ops.object.modifier_add(type='DISPLACE')
    bud.modifiers["Displace"].strength = 0.1 * density
    
    # Bud color based on stage
    if stage == 'pre':
        color = (0.25, 0.5, 0.15)  # Green with hint of white
    elif stage == 'early':
        color = (0.3, 0.55, 0.2)  # Light green with white pistils
    elif stage == 'full':
        color = (0.35, 0.5, 0.15)  # Dense green with orange pistils
    else:  # mature
        color = (0.4, 0.45, 0.1)  # Amber/orange trichomes
    
    mat = create_material(f"Bud_{stage}", color, roughness=0.8)
    bud.data.materials.append(mat)
    
    return bud

def create_pistils(count, length, parent_bud):
    """Create white/orange pistils on buds"""
    pistils = []
    for i in range(count):
        angle = (i / count) * 2 * math.pi
        
        # Create thin cylinder for pistil
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.002,
            depth=length,
            location=(
                math.cos(angle) * 0.02,
                math.sin(angle) * 0.02,
                length / 2
            )
        )
        pistil = bpy.context.active_object
        pistil.rotation_euler = (
            math.radians(30 + i * 5),
            math.radians(i * 10),
            angle
        )
        pistil.parent = parent_bud
        
        # White to orange color based on maturity
        mat = create_material(f"Pistil_{i}", (0.95, 0.9, 0.85), roughness=0.6)
        pistil.data.materials.append(mat)
        pistils.append(pistil)
    
    return pistils

def create_candelabra_plant(stage_num, stage_name):
    """
    Create cannabis plant with proper candelabra structure
    
    Stage 1-4: Vegetative (increasing size and complexity)
    Stage 5-8: Flowering (buds developing)
    """
    clear_scene()
    
    # Create empty parent for the whole plant
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    plant_root = bpy.context.active_object
    plant_root.name = f"Plant_Stage{stage_num}"
    
    # Stage parameters
    stage_params = {
        1: {'height': 0.05, 'nodes': 1, 'leaf_size': 0.015, 'stem_radius': 0.003},
        2: {'height': 0.12, 'nodes': 2, 'leaf_size': 0.025, 'stem_radius': 0.005},
        3: {'height': 0.25, 'nodes': 4, 'leaf_size': 0.04, 'stem_radius': 0.008},
        4: {'height': 0.4, 'nodes': 6, 'leaf_size': 0.05, 'stem_radius': 0.012},
        5: {'height': 0.45, 'nodes': 6, 'leaf_size': 0.045, 'stem_radius': 0.014, 'buds': 'pre'},
        6: {'height': 0.5, 'nodes': 6, 'leaf_size': 0.04, 'stem_radius': 0.015, 'buds': 'early'},
        7: {'height': 0.55, 'nodes': 6, 'leaf_size': 0.035, 'stem_radius': 0.016, 'buds': 'full'},
        8: {'height': 0.55, 'nodes': 6, 'leaf_size': 0.03, 'stem_radius': 0.016, 'buds': 'mature', 'yellowing': 0.6},
    }
    
    params = stage_params[stage_num]
    height = params['height']
    num_nodes = params['nodes']
    leaf_size = params['leaf_size']
    stem_radius = params['stem_radius']
    has_buds = 'buds' in params
    bud_stage = params.get('buds', None)
    yellowing = params.get('yellowing', 0.0)
    
    # Create main stem
    stem_mat = create_material("Stem", (0.3, 0.25, 0.15), roughness=0.8)
    
    # Main stem segments
    segment_height = height / (num_nodes + 1)
    current_z = 0
    
    for node_idx in range(num_nodes + 1):
        # Create stem segment
        radius_factor = 1 - (node_idx / (num_nodes + 1)) * 0.5
        seg_radius = stem_radius * radius_factor
        
        bpy.ops.mesh.primitive_cylinder_add(
            radius=seg_radius,
            depth=segment_height,
            location=(0, 0, current_z + segment_height / 2)
        )
        segment = bpy.context.active_object
        segment.parent = plant_root
        segment.data.materials.append(stem_mat)
        
        current_z += segment_height
        
        # Add node with branches (except for seedling)
        if node_idx < num_nodes and stage_num > 1:
            # Branch length decreases going up (candelabra shape)
            branch_length = (height * 0.4) * (1 - node_idx / num_nodes * 0.6)
            
            # Two opposing branches, rotated 90° each node
            base_angle = (node_idx % 2) * 90  # Alternate 0° and 90°
            
            for branch_idx in range(2):
                angle = math.radians(base_angle + branch_idx * 180)
                
                # Create branch
                bpy.ops.mesh.primitive_cylinder_add(
                    radius=seg_radius * 0.6,
                    depth=branch_length,
                    location=(0, 0, 0)
                )
                branch = bpy.context.active_object
                branch.parent = plant_root
                branch.data.materials.append(stem_mat)
                
                # Position and rotate branch (pointing upward at angle)
                branch.location = (
                    math.cos(angle) * seg_radius,
                    math.sin(angle) * seg_radius,
                    current_z - segment_height * 0.3
                )
                # Branches point upward at 45-60 degree angle
                tilt_angle = math.radians(45 + node_idx * 5)
                branch.rotation_euler = (
                    tilt_angle * math.cos(angle + math.pi/2),
                    tilt_angle * math.sin(angle + math.pi/2),
                    0
                )
                
                # Add leaves to branch
                branch_tip = Vector((
                    branch.location.x + math.cos(angle) * branch_length * 0.7,
                    branch.location.y + math.sin(angle) * branch_length * 0.7,
                    branch.location.z + branch_length * 0.7
                ))
                
                # Fan leaves
                for leaf_idx in range(3 if stage_num > 2 else 1):
                    leaf = create_leaf(
                        leaf_size * (1 - leaf_idx * 0.2),
                        stage='flowering' if has_buds else 'vegetative',
                        yellowing=yellowing
                    )
                    leaf.parent = plant_root
                    leaf.location = (
                        branch_tip.x - leaf_idx * 0.02 * math.cos(angle),
                        branch_tip.y - leaf_idx * 0.02 * math.sin(angle),
                        branch_tip.z - leaf_idx * 0.03
                    )
                    leaf.rotation_euler = (
                        math.radians(-30 - leaf_idx * 15),
                        0,
                        angle + math.radians(leaf_idx * 20 - 10)
                    )
                
                # Add buds during flowering stages
                if has_buds:
                    bud_size = 0.02 + (stage_num - 5) * 0.015
                    density = (stage_num - 4) / 4
                    
                    bud = create_bud(bud_size, bud_stage, density)
                    bud.parent = plant_root
                    bud.location = branch_tip
                    
                    # Add pistils
                    if stage_num >= 5:
                        pistil_count = 5 + (stage_num - 5) * 3
                        pistil_length = 0.01 + (stage_num - 5) * 0.005
                        create_pistils(pistil_count, pistil_length, bud)
    
    # Main cola at top
    if stage_num >= 3:
        # Top leaves
        for i in range(4):
            angle = i * math.pi / 2
            leaf = create_leaf(
                leaf_size * 0.8,
                stage='flowering' if has_buds else 'vegetative',
                yellowing=yellowing
            )
            leaf.parent = plant_root
            leaf.location = (
                math.cos(angle) * 0.02,
                math.sin(angle) * 0.02,
                current_z + 0.02
            )
            leaf.rotation_euler = (
                math.radians(-45),
                0,
                angle
            )
    
    # Main cola (top bud) - larger than side buds
    if has_buds:
        cola_size = 0.03 + (stage_num - 5) * 0.02
        density = (stage_num - 4) / 4
        
        main_cola = create_bud(cola_size, bud_stage, density)
        main_cola.parent = plant_root
        main_cola.location = (0, 0, current_z + cola_size)
        main_cola.scale = (1.2, 1.2, 1.5)  # Main cola is larger
        
        # More pistils on main cola
        if stage_num >= 5:
            pistil_count = 10 + (stage_num - 5) * 5
            pistil_length = 0.015 + (stage_num - 5) * 0.005
            create_pistils(pistil_count, pistil_length, main_cola)
    
    # Seedling cotyledons (stage 1 only)
    if stage_num == 1:
        for i in range(2):
            angle = i * math.pi
            bpy.ops.mesh.primitive_plane_add(size=0.02)
            cotyledon = bpy.context.active_object
            cotyledon.parent = plant_root
            cotyledon.location = (
                math.cos(angle) * 0.01,
                math.sin(angle) * 0.01,
                height * 0.8
            )
            cotyledon.rotation_euler = (math.radians(-30), 0, angle)
            
            mat = create_material("Cotyledon", (0.3, 0.6, 0.2), roughness=0.7)
            cotyledon.data.materials.append(mat)
    
    # Add soil/pot base
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.08,
        depth=0.02,
        location=(0, 0, -0.01)
    )
    soil = bpy.context.active_object
    soil.parent = plant_root
    soil_mat = create_material("Soil", (0.15, 0.1, 0.05), roughness=0.9)
    soil.data.materials.append(soil_mat)
    
    return plant_root

def export_glb(filepath):
    """Export scene as GLB"""
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_animations=False,
        export_materials='EXPORT'
    )

def main():
    """Generate all 8 growth stages"""
    output_dir = "/home/ubuntu/ks-mobile/assets/models/growth_stages"
    os.makedirs(output_dir, exist_ok=True)
    
    stages = [
        (1, "seedling"),
        (2, "young_plant"),
        (3, "mid_vegetative"),
        (4, "full_vegetative"),
        (5, "pre_flowering"),
        (6, "early_flowering"),
        (7, "full_flowering"),
        (8, "maturation"),
    ]
    
    for stage_num, stage_name in stages:
        print(f"Creating stage {stage_num}: {stage_name}")
        create_candelabra_plant(stage_num, stage_name)
        
        filepath = os.path.join(output_dir, f"plant_stage_{stage_num}_{stage_name}.glb")
        export_glb(filepath)
        print(f"Exported: {filepath}")
    
    print("All 8 growth stages created successfully!")

if __name__ == "__main__":
    main()
